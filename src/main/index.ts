import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIPC } from './ipc'
import { closeAllTerminals } from './terminal-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // required for node-pty IPC
    }
  })

  registerIPC(mainWindow)

  // In dev, load from vite dev server; in production, load the built file
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeAllTerminals()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeAllTerminals()
})
