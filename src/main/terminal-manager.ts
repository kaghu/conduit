import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'
import { getAccountConfigDir, getAccountWorkspaceDir } from './account-manager'

// Debug log to file — packaged apps have no visible stdout.
const _logFile = path.join(os.homedir(), '.conduit', 'terminal-manager.log')
function debugLog(msg: string, ...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${msg} ${args.map(a => JSON.stringify(a)).join(' ')}\n`
  try {
    fs.mkdirSync(path.dirname(_logFile), { recursive: true })
    fs.appendFileSync(_logFile, line)
  } catch {
    // ignore
  }
}

// node-pty is a native module — require it at runtime so electron-vite
// doesn't try to bundle it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
debugLog('about to require node-pty')
let pty: ReturnType<typeof require>
try {
  pty = require('node-pty')
  debugLog('node-pty loaded successfully')
} catch (err) {
  debugLog('FAILED to load node-pty:', (err as Error).message, (err as Error).stack)
  throw err
}

// Packaged apps inherit a stripped PATH. Resolve the absolute path to the
// `claude` binary so PTY spawns succeed even when PATH is incomplete.
let _claudePath: string | null = null

function isExistingFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function firstExistingFile(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (isExistingFile(candidate)) return candidate
  }
  return null
}

function resolveClaudePathWindows(): string {
  debugLog('resolveClaudePath: platform=win32, PATH=%s', process.env.PATH)

  try {
    const result = execSync('where claude', {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true
    })
      .trim()
      .split(/\r?\n/)[0]
      ?.trim()
    debugLog('where claude result:', result)
    if (result && isExistingFile(result)) {
      return result
    }
  } catch (err) {
    debugLog('where claude failed:', (err as Error).message)
  }

  const home = os.homedir()
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')

  const resolved = firstExistingFile([
    path.join(home, '.local', 'bin', 'claude.exe'),
    path.join(home, '.local', 'bin', 'claude.cmd'),
    path.join(appData, 'npm', 'claude.cmd'),
    path.join(localAppData, 'npm', 'claude.cmd'),
    path.join(home, 'scoop', 'shims', 'claude.cmd')
  ])

  if (resolved) {
    debugLog('resolved via well-known path:', resolved)
    return resolved
  }

  debugLog('could not resolve absolute path, falling back to bare "claude"')
  return 'claude'
}

function resolveClaudePathUnix(): string {
  const shell = process.env.SHELL || '/bin/zsh'
  debugLog('resolveClaudePath: SHELL=%s, PATH=%s', shell, process.env.PATH)

  try {
    const cmd = `${shell} -l -c 'which claude 2>/dev/null'`
    debugLog('trying execSync:', cmd)
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim()
    debugLog('which claude result:', result)
    if (result && result.startsWith('/')) {
      debugLog('resolved via login shell:', result)
      return result
    }
  } catch (err) {
    debugLog('login-shell which failed:', (err as Error).message)
  }

  const home = os.homedir()
  const candidates = [
    path.join(home, '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(home, '.volta', 'bin', 'claude'),
    path.join(home, '.local', 'bin', 'claude')
  ]

  try {
    const nvmDir = path.join(home, '.nvm', 'versions', 'node')
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir).sort().reverse()
      for (const v of versions) {
        candidates.push(path.join(nvmDir, v, 'bin', 'claude'))
      }
    }
  } catch {
    // ignore
  }

  debugLog('checking well-known candidates, count:', candidates.length)
  const resolved = firstExistingFile(candidates)
  if (resolved) {
    debugLog('resolved via well-known path:', resolved)
    return resolved
  }

  debugLog('could not resolve absolute path, falling back to bare "claude"')
  return 'claude'
}

function resolveClaudePath(): string {
  if (_claudePath) return _claudePath
  _claudePath =
    os.platform() === 'win32' ? resolveClaudePathWindows() : resolveClaudePathUnix()
  return _claudePath
}

interface ManagedTerminal {
  id: string
  accountId: string
  pty: InstanceType<typeof pty.IPty>
}

const terminals = new Map<string, ManagedTerminal>()

type DataCallback = (terminalId: string, data: string) => void
type ExitCallback = (terminalId: string, code: number) => void

let onDataCallback: DataCallback | null = null
let onExitCallback: ExitCallback | null = null

export function setOnData(cb: DataCallback): void {
  onDataCallback = cb
}

export function setOnExit(cb: ExitCallback): void {
  onExitCallback = cb
}

function spawnTerminal(accountId: string, command: string, args: string[]): string {
  const id = uuidv4()
  const configDir = getAccountConfigDir(accountId)
  const workspaceDir = getAccountWorkspaceDir(accountId)
  debugLog(
    'spawnTerminal id=%s cmd=%s args=%j configDir=%s workspaceDir=%s',
    id,
    command,
    args,
    configDir,
    workspaceDir
  )

  const term = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: workspaceDir,
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: configDir,
      TERM: 'xterm-256color'
    }
  })

  const managed: ManagedTerminal = { id, accountId, pty: term }
  terminals.set(id, managed)

  term.onData((data: string) => {
    onDataCallback?.(id, data)
  })

  term.onExit(({ exitCode }: { exitCode: number }) => {
    debugLog('PTY exited id=%s exitCode=%d', id, exitCode)
    onExitCallback?.(id, exitCode)
    terminals.delete(id)
  })

  return id
}

function spawnClaudeTerminal(accountId: string, claudePath: string, label: string): string {
  debugLog('%s: claudePath=%s, platform=%s', label, claudePath, os.platform())

  if (path.isAbsolute(claudePath)) {
    if (os.platform() === 'win32' && claudePath.toLowerCase().endsWith('.cmd')) {
      const cmd = process.env.ComSpec || 'cmd.exe'
      debugLog('spawning via cmd wrapper:', cmd, claudePath)
      return spawnTerminal(accountId, cmd, ['/d', '/c', claudePath])
    }
    debugLog('spawning directly (absolute path):', claudePath)
    return spawnTerminal(accountId, claudePath, [])
  }

  if (os.platform() === 'win32') {
    const cmd = process.env.ComSpec || 'cmd.exe'
    debugLog('spawning via cmd fallback:', cmd, claudePath)
    return spawnTerminal(accountId, cmd, ['/d', '/c', claudePath])
  }

  const shell = process.env.SHELL || '/bin/zsh'
  const spawnCmd = `exec "${claudePath}"`
  debugLog('spawning via login shell:', shell, '-l -c', spawnCmd)
  return spawnTerminal(accountId, shell, ['-l', '-c', spawnCmd])
}

export function createTerminal(accountId: string): string {
  return spawnClaudeTerminal(accountId, resolveClaudePath(), 'createTerminal')
}

export function createAuthTerminal(accountId: string): string {
  return spawnClaudeTerminal(accountId, resolveClaudePath(), 'createAuthTerminal')
}

export function writeTerminal(terminalId: string, data: string): void {
  terminals.get(terminalId)?.pty.write(data)
}

export function resizeTerminal(terminalId: string, cols: number, rows: number): void {
  terminals.get(terminalId)?.pty.resize(cols, rows)
}

export function closeTerminal(terminalId: string): void {
  const managed = terminals.get(terminalId)
  if (managed) {
    managed.pty.kill()
    terminals.delete(terminalId)
  }
}

export function closeAllTerminals(): void {
  for (const [id] of terminals) {
    closeTerminal(id)
  }
}
