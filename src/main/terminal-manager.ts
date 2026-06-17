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

// Packaged macOS apps inherit a stripped PATH (/usr/bin:/bin only).
// Resolve the absolute path to the `claude` binary so PTY spawns succeed
// even when the process environment has no useful PATH.
let _claudePath: string | null = null
function resolveClaudePath(): string {
  if (_claudePath) return _claudePath
  const shell = process.env.SHELL || '/bin/zsh'

  debugLog('resolveClaudePath: SHELL=%s, PATH=%s', shell, process.env.PATH)

  // 1. Try login-shell `which` — works when shell rc files set up PATH
  try {
    const cmd = `${shell} -l -c 'which claude 2>/dev/null'`
    debugLog('trying execSync:', cmd)
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 5000
    }).trim()
    debugLog('which claude result:', result)
    if (result && result.startsWith('/')) {
      _claudePath = result
      debugLog('resolved via login shell:', _claudePath)
      return _claudePath
    }
  } catch (err) {
    debugLog('login-shell which failed:', (err as Error).message)
    // fall through to well-known paths
  }

  // 2. Check well-known install locations (npm global, homebrew, nvm, volta, etc.)
  const home = os.homedir()
  const candidates = [
    path.join(home, '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(home, '.volta', 'bin', 'claude'),
    path.join(home, '.local', 'bin', 'claude')
  ]

  // Expand nvm: pick the default or highest version
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
  for (const candidate of candidates) {
    try {
      const exists = fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      if (exists) {
        _claudePath = candidate
        debugLog('resolved via well-known path:', _claudePath)
        return _claudePath
      }
    } catch {
      // ignore permission errors
    }
  }

  // 3. Last resort — bare name, will rely on the PTY login shell's PATH
  _claudePath = 'claude'
  debugLog('could not resolve absolute path, falling back to bare "claude"')
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

export function createTerminal(accountId: string): string {
  const claudePath = resolveClaudePath()
  debugLog('createTerminal: claudePath=%s', claudePath)

  if (claudePath.startsWith('/')) {
    return spawnTerminal(accountId, claudePath, [])
  }

  // Fallback: wrap in a login shell so PATH is available
  const isWin = os.platform() === 'win32'
  const shell = process.env.SHELL || (isWin ? 'powershell.exe' : '/bin/zsh')
  if (isWin) {
    return spawnTerminal(accountId, claudePath, [])
  }
  return spawnTerminal(accountId, shell, ['-l', '-c', `exec "${claudePath}"`])
}

export function createAuthTerminal(accountId: string): string {
  const claudePath = resolveClaudePath()
  debugLog('createAuthTerminal: claudePath=%s, platform=%s', claudePath, os.platform())

  if (os.platform() === 'win32') {
    debugLog('spawning directly (win32):', claudePath)
    return spawnTerminal(accountId, claudePath, [])
  }

  // If we resolved an absolute path, spawn it directly — no login shell needed.
  // This avoids issues where the shell's rc files fail or the stripped packaged-
  // app environment causes `exec` to miss the binary.
  if (claudePath.startsWith('/')) {
    debugLog('spawning directly (absolute path):', claudePath)
    return spawnTerminal(accountId, claudePath, [])
  }

  // Fallback: wrap in a login shell so it sources .zprofile/.zshrc and gets the
  // full user PATH — packaged Electron apps inherit a stripped launchd environment.
  const shell = process.env.SHELL || '/bin/zsh'
  const spawnCmd = `exec "${claudePath}"`
  debugLog('spawning via login shell:', shell, '-l -c', spawnCmd)
  return spawnTerminal(accountId, shell, ['-l', '-c', spawnCmd])
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
