import { Plus } from 'lucide-react'
import { useAppStore } from '../store'
import { AccountAvatar } from './AccountAvatar'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

export function Sidebar() {
  const { accounts, activeAccountId, setActiveAccount, setShowAddAccount, removeAccount } =
    useAppStore()

  const handleDelete = async (id: string) => {
    await window.conduit.account.delete(id)
    removeAccount(id)
  }

  return (
    <div className="titlebar-drag sidebar-rail flex shrink-0 flex-col items-center border-r border-chrome-border bg-chrome">
      <div className="sidebar-accounts">
        {accounts.map((account) => (
          <ContextMenu key={account.id}>
            <ContextMenuTrigger asChild>
              <AccountAvatar
                account={account}
                isActive={activeAccountId === account.id}
                onClick={() => setActiveAccount(account.id)}
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem variant="destructive" onSelect={() => handleDelete(account.id)}>
                Delete account
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setShowAddAccount(true)}
          className="titlebar-no-drag sidebar-account-tile size-8 rounded-md border-chrome-border text-lg leading-none text-text-muted opacity-70 hover:bg-chrome-hover hover:text-text-secondary hover:opacity-100"
          title="Add account"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
