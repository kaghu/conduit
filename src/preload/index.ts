import { contextBridge, ipcRenderer } from 'electron'
import type { ConduitAPI } from '../shared/types'

const api: ConduitAPI = {
  account: {
    list: () => ipcRenderer.invoke('account:list'),
    create: (data) => ipcRenderer.invoke('account:create', data),
    update: (id, data) => ipcRenderer.invoke('account:update', id, data),
    delete: (id) => ipcRenderer.invoke('account:delete', id),
    startAuth: (accountId) => ipcRenderer.invoke('account:start-auth', accountId),
    logout: (accountId) => ipcRenderer.invoke('account:logout', accountId),
    getEmail: (accountId) => ipcRenderer.invoke('account:email', accountId),
    onAuthenticated: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, account: Parameters<typeof callback>[0]) =>
        callback(account)
      ipcRenderer.on('account:authenticated', handler)
      return () => ipcRenderer.removeListener('account:authenticated', handler)
    }
  },
  terminal: {
    create: (accountId) => ipcRenderer.invoke('terminal:create', accountId),
    write: (terminalId, data) => ipcRenderer.send('terminal:write', terminalId, data),
    resize: (terminalId, cols, rows) =>
      ipcRenderer.send('terminal:resize', terminalId, cols, rows),
    close: (terminalId) => ipcRenderer.send('terminal:close', terminalId),
    onData: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, terminalId: string, data: string) =>
        callback(terminalId, data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
    onExit: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, terminalId: string, code: number) =>
        callback(terminalId, code)
      ipcRenderer.on('terminal:exit', handler)
      return () => ipcRenderer.removeListener('terminal:exit', handler)
    }
  }
}

contextBridge.exposeInMainWorld('conduit', api)
