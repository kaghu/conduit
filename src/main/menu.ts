import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import type { MenuAction, MenuState } from '../shared/types'

// Default app menus (File/Edit/View/Window...) plus a flat "Accounts" menu.
export function buildAppMenu(win: BrowserWindow, state: MenuState): void {
  const send = (action: MenuAction): void => win.webContents.send('menu:action', action)
  const active = state.accounts.find((a) => a.id === state.activeAccountId)

  const accountsMenu: MenuItemConstructorOptions = {
    label: 'Accounts',
    submenu: [
      ...state.accounts.map(
        (a, i): MenuItemConstructorOptions => ({
          label: a.alias,
          type: 'radio',
          checked: a.id === state.activeAccountId,
          accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
          click: () => send({ type: 'select-account', accountId: a.id })
        })
      ),
      { type: 'separator' },
      { label: 'Add Account…', click: () => send({ type: 'add-account' }) },
      {
        label: active ? `Sign out of "${active.alias}"` : 'Sign out',
        enabled: !!active,
        click: () => active && send({ type: 'sign-out', accountId: active.id })
      }
    ]
  }

  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    accountsMenu,
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
