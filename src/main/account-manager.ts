import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import type { Account, AppConfig, CreateAccountData } from '../shared/types'

const CONDUIT_DIR = path.join(app.getPath('home'), '.conduit')
const CONFIG_PATH = path.join(CONDUIT_DIR, 'conduit.json')
const ACCOUNTS_DIR = path.join(CONDUIT_DIR, 'accounts')
const WORKSPACES_DIR = path.join(CONDUIT_DIR, 'workspaces')

function ensureDirs(): void {
  fs.mkdirSync(CONDUIT_DIR, { recursive: true })
  fs.mkdirSync(ACCOUNTS_DIR, { recursive: true })
  fs.mkdirSync(WORKSPACES_DIR, { recursive: true })
}

function defaultWorkspaceDir(accountId: string): string {
  return path.join(WORKSPACES_DIR, accountId)
}

function loadConfig(): AppConfig {
  ensureDirs()
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  }
  const config: AppConfig = {
    accounts: [],
    activeAccountId: null,
    ui: { sidebarWidth: 64, theme: 'dark' }
  }
  saveConfig(config)
  return config
}

function saveConfig(config: AppConfig): void {
  ensureDirs()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

function migrateAccounts(accounts: Account[]): Account[] {
  let changed = false
  const migrated = accounts.map((account) => {
    if (account.workspaceDir) return account
    changed = true
    const workspaceDir = defaultWorkspaceDir(account.id)
    fs.mkdirSync(workspaceDir, { recursive: true })
    return { ...account, workspaceDir }
  })
  if (changed) {
    const config = loadConfig()
    config.accounts = migrated
    saveConfig(config)
  }
  return migrated
}

export function listAccounts(): Account[] {
  const config = loadConfig()
  return migrateAccounts(config.accounts)
}

export function createAccount(data: CreateAccountData): Account {
  const config = loadConfig()
  const id = uuidv4()
  const workspaceDir = data.workspaceDir ?? defaultWorkspaceDir(id)
  fs.mkdirSync(workspaceDir, { recursive: true })

  const account: Account = {
    alias: data.alias,
    color: data.color,
    authMethod: data.authMethod,
    authStatus: 'pending',
    workspaceDir,
    id,
    createdAt: new Date().toISOString()
  }

  const accountDir = path.join(ACCOUNTS_DIR, account.id)
  fs.mkdirSync(accountDir, { recursive: true })

  config.accounts.push(account)
  if (!config.activeAccountId) {
    config.activeAccountId = account.id
  }
  saveConfig(config)
  return account
}

export function markAccountAuthenticated(id: string): Account {
  const config = loadConfig()
  const idx = config.accounts.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error(`Account not found: ${id}`)

  config.accounts[idx] = { ...config.accounts[idx], authStatus: 'authenticated' }
  saveConfig(config)
  return config.accounts[idx]
}

export function updateAccount(
  id: string,
  data: Partial<Pick<Account, 'alias' | 'color' | 'workspaceDir'>>
): Account {
  const config = loadConfig()
  const idx = config.accounts.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error(`Account not found: ${id}`)

  config.accounts[idx] = { ...config.accounts[idx], ...data }
  saveConfig(config)
  return config.accounts[idx]
}

export function deleteAccount(id: string): void {
  const config = loadConfig()
  const account = config.accounts.find((a) => a.id === id)
  config.accounts = config.accounts.filter((a) => a.id !== id)
  if (config.activeAccountId === id) {
    config.activeAccountId = config.accounts[0]?.id ?? null
  }
  saveConfig(config)

  const accountDir = path.join(ACCOUNTS_DIR, id)
  if (fs.existsSync(accountDir)) {
    fs.rmSync(accountDir, { recursive: true, force: true })
  }

  const defaultWorkspace = defaultWorkspaceDir(id)
  if (account?.workspaceDir === defaultWorkspace && fs.existsSync(defaultWorkspace)) {
    fs.rmSync(defaultWorkspace, { recursive: true, force: true })
  }
}

export function logoutAccount(id: string): Account {
  const config = loadConfig()
  const idx = config.accounts.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error(`Account not found: ${id}`)

  const claudeJson = path.join(ACCOUNTS_DIR, id, '.claude.json')
  if (fs.existsSync(claudeJson)) fs.rmSync(claudeJson)

  config.accounts[idx] = { ...config.accounts[idx], authStatus: 'pending' }
  saveConfig(config)
  return config.accounts[idx]
}

export function getAccountConfigDir(id: string): string {
  return path.join(ACCOUNTS_DIR, id)
}

export function getAccountWorkspaceDir(id: string): string {
  const config = loadConfig()
  const account = config.accounts.find((a) => a.id === id)
  const workspaceDir = account?.workspaceDir ?? defaultWorkspaceDir(id)
  fs.mkdirSync(workspaceDir, { recursive: true })
  return workspaceDir
}

export function getAccountEmail(id: string): string | null {
  const claudeJson = path.join(ACCOUNTS_DIR, id, '.claude.json')
  if (!fs.existsSync(claudeJson)) return null
  try {
    const data = JSON.parse(fs.readFileSync(claudeJson, 'utf-8'))
    return data.oauthAccount?.emailAddress ?? data.oauthAccount?.email ?? null
  } catch {
    return null
  }
}
