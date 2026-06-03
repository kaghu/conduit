import os from 'node:os'
import { v4 as uuidv4 } from 'uuid'
import { getAccountConfigDir } from './account-manager'

// node-pty is a native module — require it at runtime so electron-vite
// doesn't try to bundle it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty')

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

  const term = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
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
    onExitCallback?.(id, exitCode)
    terminals.delete(id)
  })

  return id
}

export function createTerminal(accountId: string): string {
  const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash')
  return spawnTerminal(accountId, shell, [])
}

export function createAuthTerminal(accountId: string): string {
  // Spawn claude directly so the login TUI appears immediately
  return spawnTerminal(accountId, 'claude', [])
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
