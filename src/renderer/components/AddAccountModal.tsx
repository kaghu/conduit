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
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay container-pad">
        <div className="modal-shell w-full max-w-xl overflow-hidden stack-gap">
          <div className="row-gap justify-between container-pad border-b border-border-subtle">
            <div className="row-gap">
              <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-sm text-text-secondary">{alias}</span>
              <span className="text-xs text-text-muted">— complete login in the terminal</span>
            </div>
            <button
              onClick={handleCancel}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="h-72 bg-terminal container-pad">
            {authTerminalId && <TerminalView terminalId={authTerminalId} visible={true} />}
          </div>
          <div className="container-pad border-t border-border-subtle row-gap bg-surface-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            <span className="text-xs text-text-muted">
              Window will close automatically once signed in
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay container-pad">
      <div className="modal-shell w-80 overflow-hidden stack-gap">
        <div className="container-pad stack-gap">
          <div className="row-gap justify-between">
            <p className="text-xs text-text-muted uppercase tracking-wide font-medium">
              Connect account
            </p>
            {canClose && (
              <button
                onClick={() => setShowAddAccount(false)}
                className="text-text-faint hover:text-text-secondary transition-colors cursor-pointer text-lg leading-none"
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
            className="w-full px-inset py-gap text-sm text-text-primary placeholder:text-text-faint border border-chrome-border rounded-sm focus:outline-none focus:border-border-focus transition-colors bg-surface"
          />

          <div className="stack-gap">
            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">
              Workspace
            </p>
            <div className="row-gap">
              <span
                className="flex-1 min-w-0 text-xs text-text-muted truncate"
                title={formatWorkspaceLabel(workspaceDir)}
              >
                {formatWorkspaceLabel(workspaceDir)}
              </span>
              <button
                type="button"
                onClick={handlePickWorkspace}
                className="shrink-0 text-xs text-text-secondary border border-chrome-border px-inset py-gap rounded-sm hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Choose folder…
              </button>
            </div>
          </div>

          <div className="row-gap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-sm transition-all cursor-pointer shrink-0"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px'
                }}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-border-subtle" />

        <div className="stack-gap container-pad">
          <button
            onClick={() => handleLogin('email')}
            disabled={!alias.trim() || isCreating}
            className="w-full text-sm text-text-secondary text-left hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-b border-border-subtle pb-gap"
          >
            Login with email
          </button>
          <button
            onClick={() => handleLogin('google')}
            disabled={!alias.trim() || isCreating}
            className="w-full text-sm text-text-secondary text-left hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Login with google
          </button>
        </div>
      </div>
    </div>
  )
}
