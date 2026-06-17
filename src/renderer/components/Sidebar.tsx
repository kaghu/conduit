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
    <div className="titlebar-drag sidebar-rail flex flex-col items-center bg-chrome border-r border-chrome-border stack-gap shrink-0">
      <div className="flex flex-col items-center stack-gap flex-1 overflow-y-auto w-full">
        {accounts.map((account) => (
          <ContextMenu.Root key={account.id}>
            <ContextMenu.Trigger asChild>
              <div>
                <AccountAvatar
                  account={account}
                  isActive={activeAccountId === account.id}
                  onClick={() => setActiveAccount(account.id)}
                />
              </div>
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
      </div>

      <button
        onClick={() => setShowAddAccount(true)}
        className="titlebar-no-drag flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-secondary hover:bg-chrome-hover transition-colors cursor-pointer text-lg leading-none"
        title="Add account"
      >
        +
      </button>
    </div>
  )
}
