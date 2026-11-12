import { forwardRef } from 'react'
import type { Account } from '../../shared/types'

interface AccountAvatarProps {
  account: Account
  isActive: boolean
  onClick: () => void
}

// "Work Main" → WM, "camelCase" → CC, "PascalCase" → PC, "personal" → PE
export function accountInitials(alias: string): string {
  const parts = alias
    .trim()
    .split(/[\s_-]+/)
    .flatMap((w) => w.split(/(?<=[a-z0-9])(?=[A-Z])/))
    .filter(Boolean)
  if (!parts.length) return '?'
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase()
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
          className={`w-8 h-8 rounded-md transition-all flex items-center justify-center text-white text-xs font-semibold tracking-tight select-none ${
            isActive
              ? 'opacity-100 ring-1 ring-chrome-border'
              : 'opacity-80 group-hover:opacity-100'
          }`}
          // Dynamic hex: active = a tone darker, passive = mixed toward gray.
          style={{
            backgroundColor: isActive
              ? `color-mix(in srgb, ${account.color} 80%, black)`
              : `color-mix(in srgb, ${account.color} 35%, #71717a)`
          }}
        >
          {accountInitials(account.alias)}
        </div>
      </button>
    )
  }
)
