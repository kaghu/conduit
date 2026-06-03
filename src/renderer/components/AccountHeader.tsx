import type { Account } from '../../shared/types'

interface AccountHeaderProps {
  account: Account
}

export function AccountHeader({ account }: AccountHeaderProps) {
  return (
    <div className="titlebar-drag flex items-center justify-center h-9 px-4 bg-neutral-200 border-b border-neutral-300">
      <span className="titlebar-no-drag text-xs font-medium text-neutral-600 select-none">
        {account.alias}
      </span>
    </div>
  )
}
