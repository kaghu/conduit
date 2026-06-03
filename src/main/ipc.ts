import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  markAccountAuthenticated,
  logoutAccount,
  getAccountConfigDir,
  getAccountEmail
} from './account-manager'
import {
  createTerminal,
  createAuthTerminal,
  writeTerminal,
  resizeTerminal,
  closeTerminal,
  setOnData,
  setOnExit
} from './terminal-manager'

// Claude CLI writes .claude.json and sets oauthAccount once login completes
const CLAUDE_JSON = '.claude.json'

function isAuthenticated(configDir: string): boolean {
  const filePath = path.join(configDir, CLAUDE_JSON)
  if (!fs.existsSync(filePath)) return false
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return !!data.oauthAccount
  } catch {
    return false
  }
}

export function registerIPC(mainWindow: BrowserWindow): void {
  // ── Account channels ──────────────────────────────────────────────
  ipcMain.handle('account:list', () => listAccounts())

  ipcMain.handle('account:create', (_e, data) => createAccount(data))

  ipcMain.handle('account:update', (_e, id: string, data) => updateAccount(id, data))

  ipcMain.handle('account:delete', (_e, id: string) => {
    deleteAccount(id)
  })

  ipcMain.handle('account:logout', (_e, id: string) => logoutAccount(id))

  ipcMain.handle('account:email', (_e, id: string) => getAccountEmail(id))

  ipcMain.handle('account:start-auth', (_e, accountId: string) => {
    const configDir = getAccountConfigDir(accountId)
    const terminalId = createAuthTerminal(accountId)

    function finish() {
      clearInterval(interval)
      try { watcher.close() } catch {}
      closeTerminal(terminalId)
      const account = markAccountAuthenticated(accountId)
      mainWindow.webContents.send('account:authenticated', account)
    }

    // Poll every 1s — fs.watch misses file-content changes on macOS
    const interval = setInterval(() => {
      if (isAuthenticated(configDir)) finish()
    }, 1000)

    // Also react immediately on any dir-level change
    const watcher = fs.watch(configDir, { recursive: true }, () => {
      if (isAuthenticated(configDir)) finish()
    })

    return terminalId
  })

  // ── Terminal channels ─────────────────────────────────────────────
  ipcMain.handle('terminal:create', (_e, accountId: string) => {
    return createTerminal(accountId)
  })

  ipcMain.on('terminal:write', (_e, terminalId: string, data: string) => {
    writeTerminal(terminalId, data)
  })

  ipcMain.on('terminal:resize', (_e, terminalId: string, cols: number, rows: number) => {
    resizeTerminal(terminalId, cols, rows)
  })

  ipcMain.on('terminal:close', (_e, terminalId: string) => {
    closeTerminal(terminalId)
  })

  // ── Terminal → Renderer streams ───────────────────────────────────
  setOnData((terminalId, data) => {
    mainWindow.webContents.send('terminal:data', terminalId, data)
  })

  setOnExit((terminalId, code) => {
    mainWindow.webContents.send('terminal:exit', terminalId, code)
  })
}
