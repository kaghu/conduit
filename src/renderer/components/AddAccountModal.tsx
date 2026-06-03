import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { TerminalView } from './TerminalView'
import type { Account } from '../../shared/types'

const PRESET_COLORS = ['#06b6d4', '#3b82f6', '#f97316', '#ef4444']

type Step = 'setup' | 'auth'

export function AddAccountModal() {
  const { setShowAddAccount, addAccount, setActiveAccount, addTab, accounts } = useAppStore()
  const [step, setStep] = useState<Step>('setup')
  const [alias, setAlias] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)
  const [authTerminalId, setAuthTerminalId] = useState<string | null>(null)
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null)

  const canClose = accounts.length > 0

  useEffect(() => {
    const remove = window.conduit.account.onAuthenticated(async (account) => {
      if (account.id !== pendingAccount?.id) return
      addAccount(account)
      setActiveAccount(account.id)
      try {
        const terminalId = await window.conduit.terminal.create(account.id)
        addTab(account.id, {
          id: terminalId,
          accountId: account.id,
          title: 'Terminal',
          createdAt: new Date().toISOString()
        })
      } catch (err) {
        console.error('Failed to open terminal after auth:', err)
      }
      setShowAddAccount(false)
    })
    return remove
  }, [pendingAccount, addAccount, setActiveAccount, addTab, setShowAddAccount])

  const handleLogin = async (authMethod: 'email' | 'google') => {
    if (!alias.trim() || isCreating) return
    setIsCreating(true)
    try {
      const account = await window.conduit.account.create({
        alias: alias.trim(),
        color,
        authMethod
      })
      const terminalId = await window.conduit.account.startAuth(account.id)
      setPendingAccount(account)
      setAuthTerminalId(terminalId)
      setStep('auth')
    } catch (err) {
      console.error('Failed to start auth:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = async () => {
    if (authTerminalId) window.conduit.terminal.close(authTerminalId)
    if (pendingAccount) await window.conduit.account.delete(pendingAccount.id)
    setAuthTerminalId(null)
    setPendingAccount(null)
    setStep('setup')
  }

  /* ── Auth step — embedded terminal ─────────────────────────────── */
  if (step === 'auth') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl overflow-hidden border border-[#d1d1d1]">
          {/* header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[12px] text-[#333]">{alias}</span>
              <span className="text-[11px] text-[#888]">— complete login in the terminal</span>
            </div>
            <button
              onClick={handleCancel}
              className="text-[11px] text-[#888] hover:text-[#333] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* terminal */}
          <div className="h-72 bg-black">
            {authTerminalId && <TerminalView terminalId={authTerminalId} visible={true} />}
          </div>

          {/* footer */}
          <div className="px-4 py-2 border-t border-[#e5e5e5] flex items-center gap-2 bg-[#fafafa]">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] text-[#888]">
              Window will close automatically once signed in
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Setup step ─────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-72 border border-[#d1d1d1] overflow-hidden">
        {/* Title */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-[#888] uppercase tracking-wide font-medium">Connect account</p>
            {canClose && (
              <button
                onClick={() => setShowAddAccount(false)}
                className="text-[#aaa] hover:text-[#555] transition-colors cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Nickname input */}
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && alias.trim() && handleLogin('email')}
            placeholder="Account nickname"
            maxLength={24}
            autoFocus
            className="w-full px-2.5 py-1.5 text-[12px] text-[#111] placeholder:text-[#bbb] border border-[#d1d1d1] rounded focus:outline-none focus:border-[#999] transition-colors bg-white"
          />

          {/* Color swatches */}
          <div className="flex items-center gap-2 mt-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-sm transition-all cursor-pointer shrink-0"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px'
                }}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#e5e5e5]" />

        {/* Login buttons */}
        <div className="flex flex-col">
          <button
            onClick={() => handleLogin('email')}
            disabled={!alias.trim() || isCreating}
            className="w-full px-5 py-2.5 text-[12px] text-[#333] text-left hover:bg-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-b border-[#e5e5e5]"
          >
            Login with email
          </button>
          <button
            onClick={() => handleLogin('google')}
            disabled={!alias.trim() || isCreating}
            className="w-full px-5 py-2.5 text-[12px] text-[#333] text-left hover:bg-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Login with google
          </button>
        </div>
      </div>
    </div>
  )
}
