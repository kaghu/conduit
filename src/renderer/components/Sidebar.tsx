import { useAppStore } from '../store'
import { AccountAvatar } from './AccountAvatar'
import { useState, useRef, useEffect } from 'react'

export function Sidebar() {
  const { accounts, activeAccountId, setActiveAccount, setShowAddAccount, removeAccount } =
    useAppStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; accountId: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleDelete = async (id: string) => {
    setContextMenu(null)
    await window.conduit.account.delete(id)
    removeAccount(id)
  }

  return (
    <div className="titlebar-drag flex flex-col items-center w-7 bg-[#ececec] border-r border-[#d1d1d1] py-2 gap-2 shrink-0">
      {/* Account avatars */}
      <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto">
        {accounts.map((account) => (
          <AccountAvatar
            key={account.id}
            account={account}
            isActive={activeAccountId === account.id}
            onClick={() => setActiveAccount(account.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, accountId: account.id })
            }}
          />
        ))}
      </div>

      {/* Add account */}
      <button
        onClick={() => setShowAddAccount(true)}
        className="titlebar-no-drag flex items-center justify-center w-4 h-4 text-[#888] hover:text-[#333] transition-colors cursor-pointer text-base leading-none"
        title="Add account"
      >
        +
      </button>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-[#d1d1d1] rounded-md shadow-lg py-1 min-w-[130px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleDelete(contextMenu.accountId)}
            className="w-full text-left px-3 py-1 text-[12px] text-red-500 hover:bg-[#f0f0f0] transition-colors"
          >
            Delete account
          </button>
        </div>
      )}
    </div>
  )
}
