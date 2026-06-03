import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import type { Account } from '../../shared/types'

export function TitleBar() {
  const { accounts, activeAccountId, removeAccount, tabs } = useAppStore()
  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEmail(null)
    if (!activeAccountId) return
    window.conduit.account.getEmail(activeAccountId).then(setEmail)
  }, [activeAccountId])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = async (accountId: string) => {
    setOpen(false)

    // Close all open terminals for this account
    const accountTabs = tabs[accountId] ?? []
    for (const tab of accountTabs) {
      window.conduit.terminal.close(tab.id)
    }

    // Delete account — store's removeAccount switches activeAccountId to accounts[0]
    await window.conduit.account.delete(accountId)
    removeAccount(accountId)
  }

  return (
    <div className="titlebar-drag relative flex items-center w-full h-8 bg-[#ececec] border-b border-[#d1d1d1] shrink-0 select-none">

      {activeAccount && (
        <div className="titlebar-no-drag absolute right-0 top-0 bottom-0 flex items-center pr-2.5" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2 h-5 rounded transition-colors cursor-pointer ${
              open ? 'bg-[#d8d8d8]' : 'hover:bg-[#e0e0e0]'
            }`}
          >
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: activeAccount.color }} />
            <span className="text-[11px] text-[#444]">{activeAccount.alias}</span>
            <svg
              width="8" height="8" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              className={`text-[#888] transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {open && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-[#d1d1d1] rounded-lg shadow-lg overflow-hidden z-50">

              {/* Active account header */}
              <div className="px-3 py-2.5 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: activeAccount.color }} />
                  <span className="text-[12px] font-medium text-[#111] truncate">{activeAccount.alias}</span>
                </div>
                {email && <p className="text-[11px] text-[#888] truncate pl-6">{email}</p>}
                <p className="text-[10px] text-[#bbb] pl-6 mt-0.5">
                  {activeAccount.authStatus === 'authenticated' ? '● Signed in' : '○ Not signed in'}
                </p>
              </div>

              {/* All accounts — each with its own sign-out */}
              <div className="py-1 border-b border-[#f0f0f0]">
                {accounts.map((acc) => (
                  <AccountRow
                    key={acc.id}
                    account={acc}
                    isActive={acc.id === activeAccountId}
                    onLogout={() => handleLogout(acc.id)}
                  />
                ))}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AccountRow({
  account,
  isActive,
  onLogout,
}: {
  account: Account
  isActive: boolean
  onLogout: () => void
}) {
  return (
    <div className={`group flex items-center gap-2 px-3 py-1.5 ${isActive ? 'bg-[#f7f7f7]' : 'hover:bg-[#f7f7f7]'} transition-colors`}>
      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: account.color }} />
      <span className={`text-[11px] truncate flex-1 ${isActive ? 'text-[#111] font-medium' : 'text-[#555]'}`}>
        {account.alias}
      </span>
      {account.authStatus === 'authenticated' && (
        <span className="text-[10px] text-green-500 shrink-0 group-hover:hidden">●</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onLogout() }}
        className="hidden group-hover:block text-[10px] text-red-400 hover:text-red-600 cursor-pointer transition-colors shrink-0"
        title={`Sign out of ${account.alias}`}
      >
        Sign out
      </button>
    </div>
  )
}
