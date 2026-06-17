import type { Account } from '../../shared/types'

interface AccountHeaderProps {
  account: Account
}

export function AccountHeader({ account }: AccountHeaderProps) {
  return (
    <div className="titlebar-drag flex items-center justify-center h-9 px-4 bg-chrome border-b border-chrome-border">
      <span className="titlebar-no-drag text-xs font-medium text-text-muted select-none">
        {account.alias}
      </span>
    </div>
  )
}
