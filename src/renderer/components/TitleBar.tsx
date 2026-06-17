import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAppStore } from '../store'
import type { Account } from '../../shared/types'

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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="row-gap px-gap py-1 rounded-sm transition-colors cursor-pointer hover:bg-chrome-hover data-[state=open]:bg-chrome-active">
                <div
                  className="w-3.5 h-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: activeAccount.color }}
                />
                <span className="text-xs text-text-secondary">{activeAccount.alias}</span>
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-text-muted"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu-surface w-56" align="end" sideOffset={4}>
                <div className="menu-label stack-gap">
                  <div className="row-gap">
                    <div
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: activeAccount.color }}
                    />
                    <span className="text-xs font-medium text-text-primary truncate">
                      {activeAccount.alias}
                    </span>
                  </div>
                  {email && (
                    <p className="text-[11px] text-text-muted truncate pl-6">{email}</p>
                  )}
                  <p className="text-[10px] text-text-faint pl-6 mt-0.5">
                    {activeAccount.authStatus === 'authenticated'
                      ? '● Signed in'
                      : '○ Not signed in'}
                  </p>
                </div>

                <DropdownMenu.Separator className="menu-separator" />

                {accounts.map((acc) => (
                  <AccountMenuRow
                    key={acc.id}
                    account={acc}
                    isActive={acc.id === activeAccountId}
                    onLogout={() => handleLogout(acc.id)}
                  />
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
    </div>
  )
}

function AccountMenuRow({
  account,
  isActive,
  onLogout,
}: {
  account: Account
  isActive: boolean
  onLogout: () => void
}) {
  return (
    <div
      className={`menu-item group ${isActive ? 'bg-surface-hover' : ''}`}
    >
      <div
        className="w-3 h-3 rounded-sm shrink-0"
        style={{ backgroundColor: account.color }}
      />
      <span
        className={`text-[11px] truncate flex-1 ${
          isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
        }`}
      >
        {account.alias}
      </span>
      {account.authStatus === 'authenticated' && (
        <span className="text-[10px] text-success shrink-0 group-hover:hidden">●</span>
      )}
      <button
        type="button"
        onClick={onLogout}
        className="hidden group-hover:block text-[10px] text-danger hover:text-danger-hover cursor-pointer transition-colors shrink-0"
        title={`Sign out of ${account.alias}`}
      >
        Sign out
      </button>
    </div>
  )
}
