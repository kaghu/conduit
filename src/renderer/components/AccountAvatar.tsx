import { forwardRef } from 'react'
import type { Account } from '../../shared/types'

interface AccountAvatarProps {
  account: Account
  isActive: boolean
  onClick: () => void
}

function accountInitial(alias: string): string {
  const trimmed = alias.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

export const AccountAvatar = forwardRef<HTMLButtonElement, AccountAvatarProps>(
  function AccountAvatar({ account, isActive, onClick }, ref) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className="titlebar-no-drag sidebar-account-tile relative cursor-pointer group shrink-0"
        title={account.alias}
      >
        {isActive && <div className="avatar-indicator" />}
        <div
          className={`w-8 h-8 rounded-md transition-all flex items-center justify-center text-white text-sm font-semibold select-none ${
            isActive
              ? 'opacity-100 ring-1 ring-chrome-border'
              : 'opacity-70 group-hover:opacity-100'
          }`}
          style={{ backgroundColor: account.color }}
        >
          {accountInitial(account.alias)}
        </div>
      </button>
    )
  }
)
