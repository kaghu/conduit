import { useState, useEffect } from 'react'
import { FolderOpen, Mail, X } from 'lucide-react'
import { useAppStore } from '../store'
import { TerminalView } from './TerminalView'
import { GoogleIcon } from './icons/GoogleIcon'
import type { Account } from '../../shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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

  const handleDismiss = () => {
    if (canClose) setShowAddAccount(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) handleDismiss()
  }

  if (step === 'auth') {
    return (
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-row items-center gap-2 space-y-0 border-b px-4 py-2 text-left">
            <div className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
            <DialogTitle className="truncate text-xs font-medium">{alias}</DialogTitle>
            <DialogDescription className="truncate text-[11px]">
              — complete login in the terminal
            </DialogDescription>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-sm"
        onPointerDownOutside={(e) => {
          if (!canClose) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) e.preventDefault()
        }}
      >
        {canClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10"
            aria-label="Close"
          >
            <X />
          </Button>
        )}

        <DialogHeader className={canClose ? 'pr-8' : undefined}>
          <DialogTitle>Connect account</DialogTitle>
          <DialogDescription>
            Choose a nickname and sign in with Google or email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-alias">Nickname</Label>
            <Input
              id="account-alias"
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

        <DialogFooter className="flex-col gap-2 sm:flex-col">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
