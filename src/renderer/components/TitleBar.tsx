import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '../store'
import type { Account } from '../../shared/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function TitleBar() {
  const { accounts, activeAccountId, removeAccount, tabs } = useAppStore()
  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null

  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    setEmail(null)
    if (!activeAccountId) return
    window.conduit.account.getEmail(activeAccountId).then(setEmail)
  }, [activeAccountId])

  const handleLogout = async (accountId: string) => {
    const accountTabs = tabs[accountId] ?? []
    for (const tab of accountTabs) {
      window.conduit.terminal.close(tab.id)
    }
    await window.conduit.account.delete(accountId)
    removeAccount(accountId)
  }

  return (
    <div className="titlebar-drag titlebar-macos-padding titlebar-region bg-chrome border-b border-chrome-border shrink-0 select-none">
      {activeAccount && (
        <div className="titlebar-no-drag">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-text-secondary hover:bg-chrome-hover data-[state=open]:bg-chrome-active"
              >
                <div
                  className="size-3.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: activeAccount.color }}
                />
                <span>{activeAccount.alias}</span>
                <ChevronDown className="size-3 text-text-muted" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" sideOffset={4}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-4 shrink-0 rounded-sm"
                      style={{ backgroundColor: activeAccount.color }}
                    />
                    <span className="truncate text-xs font-medium text-foreground">
                      {activeAccount.alias}
                    </span>
                  </div>
                  {email && (
                    <p className="truncate pl-6 text-[11px] text-muted-foreground">{email}</p>
                  )}
                  <p className="pl-6 text-[10px] text-muted-foreground">
                    {activeAccount.authStatus === 'authenticated'
                      ? '● Signed in'
                      : '○ Not signed in'}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {accounts.map((acc) => (
                <AccountMenuRow
                  key={acc.id}
                  account={acc}
                  isActive={acc.id === activeAccountId}
                  onLogout={() => handleLogout(acc.id)}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

function AccountMenuRow({
  account,
  isActive,
  onLogout
}: {
  account: Account
  isActive: boolean
  onLogout: () => void
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 text-sm ${
        isActive ? 'bg-accent' : ''
      }`}
    >
      <div
        className="size-3 shrink-0 rounded-sm"
        style={{ backgroundColor: account.color }}
      />
      <span
        className={`min-w-0 flex-1 truncate text-[11px] ${
          isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
        }`}
      >
        {account.alias}
      </span>
      {account.authStatus === 'authenticated' && (
        <span className="shrink-0 text-[10px] text-success group-hover:hidden">●</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onLogout}
        className="hidden h-auto px-1 py-0 text-[10px] text-destructive hover:bg-transparent hover:text-danger-hover group-hover:inline-flex"
        title={`Sign out of ${account.alias}`}
      >
        Sign out
      </Button>
    </div>
  )
}
