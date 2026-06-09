import { app, BrowserWindow, nativeImage } from 'electron'
import path from 'node:path'
import { registerIPC } from './ipc'
import { closeAllTerminals } from './terminal-manager'

let mainWindow: BrowserWindow | null = null

function getIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../resources/icon.png')
}

function createWindow(): void {
  const icon = nativeImage.createFromPath(getIconPath())

  if (process.platform === 'darwin') {
    app.dock.setIcon(icon)
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    icon,
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

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

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
