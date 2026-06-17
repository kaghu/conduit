import { ipcMain, BrowserWindow, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Platform } from '../shared/types'
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
  ipcMain.handle('app:get-platform', (): Platform => {
    const platform = process.platform
    if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
      return platform
    }
    return 'linux'
  })

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
    let finished = false

    function finish() {
      if (finished) return
      finished = true
      clearInterval(interval)
      try {
        watcher.close()
      } catch {
        // watcher may already be closed
      }
      const account = markAccountAuthenticated(accountId)
      mainWindow.webContents.send('account:authenticated', account)
    }

    const interval = setInterval(() => {
      if (isAuthenticated(configDir)) finish()
    }, 1000)

    const watcher = fs.watch(configDir, { recursive: true }, () => {
      if (isAuthenticated(configDir)) finish()
    })

    return terminalId
  })

  ipcMain.handle('dialog:pick-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

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

  setOnData((terminalId, data) => {
    mainWindow.webContents.send('terminal:data', terminalId, data)
  })

  setOnExit((terminalId, code) => {
    mainWindow.webContents.send('terminal:exit', terminalId, code)
  })
}
