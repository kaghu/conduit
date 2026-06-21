import * as ContextMenu from '@radix-ui/react-context-menu'
import { useAppStore } from '../store'
import { AccountAvatar } from './AccountAvatar'

export function Sidebar() {
  const { accounts, activeAccountId, setActiveAccount, setShowAddAccount, removeAccount } =
    useAppStore()

  const handleDelete = async (id: string) => {
    await window.conduit.account.delete(id)
    removeAccount(id)
  }

  return (
    <div className="titlebar-drag sidebar-rail flex flex-col items-center bg-chrome border-r border-chrome-border shrink-0">
      <div className="sidebar-accounts">
        {accounts.map((account) => (
          <ContextMenu.Root key={account.id}>
            <ContextMenu.Trigger asChild>
              <AccountAvatar
                account={account}
                isActive={activeAccountId === account.id}
                onClick={() => setActiveAccount(account.id)}
              />
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Content className="menu-surface">
                <ContextMenu.Item
                  className="menu-item menu-item-danger"
                  onSelect={() => handleDelete(account.id)}
                >
                  Delete account
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        ))}

        <button
          type="button"
          onClick={() => setShowAddAccount(true)}
          className="titlebar-no-drag sidebar-account-tile cursor-pointer group shrink-0"
          title="Add account"
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted border border-chrome-border transition-all opacity-70 group-hover:opacity-100 group-hover:bg-chrome-hover group-hover:text-text-secondary text-lg leading-none">
            +
          </div>
        </button>
      </div>
    </div>
  )
}
