import type { Account } from '../../shared/types'

interface AccountAvatarProps {
  account: Account
  isActive: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function AccountAvatar({ account, isActive, onClick, onContextMenu }: AccountAvatarProps) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="titlebar-no-drag relative flex items-center justify-center cursor-pointer group"
      title={account.alias}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-r-full bg-[#555]" />
      )}
      <div
        className={`w-4 h-4 rounded-sm transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`}
        style={{ backgroundColor: account.color }}
      />
    </button>
  )
}
