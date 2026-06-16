export interface Account {
  id: string
  alias: string
  color: string
  authMethod: 'email' | 'google'
  authStatus: 'pending' | 'authenticated'
  workspaceDir: string
  createdAt: string
}

export type CreateAccountData = Omit<Account, 'id' | 'createdAt' | 'authStatus' | 'workspaceDir'> & {
  workspaceDir?: string
}

export interface TerminalTab {
  id: string
  accountId: string
  title: string
  createdAt: string
}

export interface AppConfig {
  accounts: Account[]
  activeAccountId: string | null
  ui: {
    sidebarWidth: number
    theme: 'dark' | 'light'
  }
}

export interface ConduitAPI {
  account: {
    list: () => Promise<Account[]>
    create: (data: CreateAccountData) => Promise<Account>
    update: (id: string, data: Partial<Pick<Account, 'alias' | 'color' | 'workspaceDir'>>) => Promise<Account>
    delete: (id: string) => Promise<void>
    startAuth: (accountId: string) => Promise<string>
    logout: (accountId: string) => Promise<Account>
    getEmail: (accountId: string) => Promise<string | null>
    onAuthenticated: (callback: (account: Account) => void) => () => void
  }
  dialog: {
    pickDirectory: () => Promise<string | null>
  }
  terminal: {
    create: (accountId: string) => Promise<string>
    write: (terminalId: string, data: string) => void
    resize: (terminalId: string, cols: number, rows: number) => void
    close: (terminalId: string) => void
    onData: (callback: (terminalId: string, data: string) => void) => () => void
    onExit: (callback: (terminalId: string, code: number) => void) => () => void
  }
}

declare global {
  interface Window {
    conduit: ConduitAPI
  }
}
