import { useState, useEffect } from 'react'
import { FolderOpen, Mail, X } from 'lucide-react'
import { useAppStore } from '../store'
import { TerminalView } from './TerminalView'
import { GoogleIcon } from './icons/GoogleIcon'
import type { Account } from '../../shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const PRESET_COLORS = ['#06b6d4', '#3b82f6', '#f97316', '#ef4444']
const DEFAULT_WORKSPACE_HINT = '~/.conduit/workspaces/<account>'

type Step = 'setup' | 'auth'

function formatWorkspaceLabel(path: string | null): string {
  if (!path) return DEFAULT_WORKSPACE_HINT
  return path.replace(/^\/Users\/[^/]+/, '~')
}

export function WelcomePage() {
  const { addAccount, setActiveAccount, addTab } = useAppStore()
  const [step, setStep] = useState<Step>('setup')
  const [alias, setAlias] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [authTerminalId, setAuthTerminalId] = useState<string | null>(null)
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null)

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
    })
    return remove
  }, [pendingAccount, authTerminalId, addAccount, setActiveAccount, addTab])

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
      <div className="flex h-full w-full items-center justify-center bg-terminal p-6">
        <div className="titlebar-drag titlebar-macos-padding titlebar-region fixed inset-x-0 top-0 border-0 bg-transparent" />
        <div className="titlebar-no-drag grid w-full max-w-xl gap-0 overflow-hidden rounded-lg border bg-background shadow-lg">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <div className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
            <span className="truncate text-xs font-medium text-foreground">{alias}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              — complete login in the terminal
            </span>
          </div>
          <div className="h-72 bg-terminal p-3">
            {authTerminalId && <TerminalView terminalId={authTerminalId} visible={true} />}
          </div>
          <div className="flex items-center justify-between gap-3 border-t bg-muted px-3 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="size-1.5 shrink-0 animate-pulse rounded-full bg-warning" />
              <span className="truncate text-[11px] text-muted-foreground">
                Closes automatically when signed in
              </span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleCancel}
              className="h-6 shrink-0 px-2 text-[11px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-terminal p-6">
      <div className="titlebar-drag titlebar-macos-padding titlebar-region fixed inset-x-0 top-0 border-0 bg-transparent" />
      <div className="titlebar-no-drag relative grid w-full max-w-sm gap-4 overflow-hidden rounded-lg border bg-background p-6 shadow-lg">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => window.close()}
          className="absolute top-4 right-4 z-10"
          aria-label="Close"
        >
          <X />
        </Button>

        <div className="flex flex-col gap-2 pr-8 text-left">
          <h1 className="text-lg leading-none font-semibold text-foreground">Connect account</h1>
          <p className="text-sm text-muted-foreground">
            Choose a nickname and sign in with Google or email.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-alias">Nickname</Label>
            <Input
              id="welcome-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && alias.trim() && handleLogin('email')}
              placeholder="Work, Personal…"
              maxLength={24}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Workspace</Label>
            <div className="flex items-center gap-2">
              <span
                className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
                title={formatWorkspaceLabel(workspaceDir)}
              >
                {formatWorkspaceLabel(workspaceDir)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePickWorkspace}
                className="shrink-0"
              >
                <FolderOpen />
                Choose…
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="size-6 shrink-0 cursor-pointer rounded-sm transition-all"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px'
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!alias.trim() || isCreating}
            onClick={() => handleLogin('google')}
            className="h-11 w-full border-border bg-white font-medium text-[#3c4043] shadow-xs hover:bg-[#f8f9fa] hover:text-[#3c4043]"
          >
            <GoogleIcon className="size-5" />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!alias.trim() || isCreating}
            onClick={() => handleLogin('email')}
            className="h-11 w-full"
          >
            <Mail />
            Continue with email
          </Button>
        </div>
      </div>
    </div>
  )
}
