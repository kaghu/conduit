import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { TerminalView } from './TerminalView'
import type { Account } from '../../shared/types'

const PRESET_COLORS = ['#06b6d4', '#3b82f6', '#f97316', '#ef4444']
const DEFAULT_WORKSPACE_HINT = '~/.conduit/workspaces/<account>'

type Step = 'setup' | 'auth'

function formatWorkspaceLabel(path: string | null): string {
  if (!path) return DEFAULT_WORKSPACE_HINT
  return path.replace(/^\/Users\/[^/]+/, '~')
}

export function AddAccountModal() {
  const { setShowAddAccount, addAccount, setActiveAccount, addTab, accounts } = useAppStore()
  const [step, setStep] = useState<Step>('setup')
  const [alias, setAlias] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [authTerminalId, setAuthTerminalId] = useState<string | null>(null)
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null)

  const canClose = accounts.length > 0

  useEffect(() => {
    const remove = window.conduit.account.onAuthenticated((account) => {
      if (account.id !== pendingAccount?.id || !authTerminalId) return
      addAccount(account)
      setActiveAccount(account.id)
      addTab(account.id, {
        id: authTerminalId,
        accountId: account.id,
        title: 'Terminal',
        createdAt: new Date().toISOString()
      })
      setShowAddAccount(false)
    })
    return remove
  }, [pendingAccount, authTerminalId, addAccount, setActiveAccount, addTab, setShowAddAccount])

  const handlePickWorkspace = async () => {
    const picked = await window.conduit.dialog.pickDirectory()
    if (picked) setWorkspaceDir(picked)
  }

  const handleLogin = async (authMethod: 'email' | 'google') => {
    if (!alias.trim() || isCreating) return
    setIsCreating(true)
    try {
      const account = await window.conduit.account.create({
        alias: alias.trim(),
        color,
        authMethod,
        ...(workspaceDir ? { workspaceDir } : {})
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

  if (step === 'auth') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl overflow-hidden border border-[#d1d1d1]">
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
          <div className="h-72 bg-black">
            {authTerminalId && <TerminalView terminalId={authTerminalId} visible={true} />}
          </div>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-80 border border-[#d1d1d1] overflow-hidden">
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

          <div className="mt-3">
            <p className="text-[10px] text-[#888] uppercase tracking-wide font-medium mb-1.5">
              Workspace
            </p>
            <div className="flex items-center gap-2">
              <span
                className="flex-1 min-w-0 text-[11px] text-[#666] truncate"
                title={formatWorkspaceLabel(workspaceDir)}
              >
                {formatWorkspaceLabel(workspaceDir)}
              </span>
              <button
                type="button"
                onClick={handlePickWorkspace}
                className="shrink-0 text-[11px] text-[#333] border border-[#d1d1d1] px-2 py-0.5 rounded hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              >
                Choose folder…
              </button>
            </div>
          </div>

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

        <div className="h-px bg-[#e5e5e5]" />

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
