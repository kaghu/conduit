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

export function AccountAvatar({ account, isActive, onClick }: AccountAvatarProps) {
  return (
    <button
      onClick={onClick}
      className="titlebar-no-drag relative flex items-center justify-center w-8 h-8 cursor-pointer group"
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
