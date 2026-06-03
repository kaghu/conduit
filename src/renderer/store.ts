import { create } from 'zustand'
import type { Account, TerminalTab } from '../shared/types'

interface AppState {
  // Accounts
  accounts: Account[]
  activeAccountId: string | null
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  removeAccount: (id: string) => void
  setActiveAccount: (id: string) => void
  updateAccount: (id: string, data: Partial<Pick<Account, 'alias' | 'color'>>) => void

  // Terminals (per account)
  tabs: Record<string, TerminalTab[]>
  activeTabId: Record<string, string>
  addTab: (accountId: string, tab: TerminalTab) => void
  closeTab: (accountId: string, tabId: string) => void
  setActiveTab: (accountId: string, tabId: string) => void

  // UI
  showAddAccount: boolean
  setShowAddAccount: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Accounts
  accounts: [],
  activeAccountId: null,
  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) =>
    set((state) => ({
      accounts: [...state.accounts, account],
      activeAccountId: state.activeAccountId ?? account.id,
      tabs: { ...state.tabs, [account.id]: [] },
      activeTabId: { ...state.activeTabId, [account.id]: '' }
    })),
  removeAccount: (id) =>
    set((state) => {
      const accounts = state.accounts.filter((a) => a.id !== id)
      const { [id]: _tabs, ...tabs } = state.tabs
      const { [id]: _activeTab, ...activeTabId } = state.activeTabId
      return {
        accounts,
        tabs,
        activeTabId,
        activeAccountId:
          state.activeAccountId === id ? (accounts[0]?.id ?? null) : state.activeAccountId
      }
    }),
  setActiveAccount: (id) => set({ activeAccountId: id }),
  updateAccount: (id, data) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...data } : a))
    })),

  // Terminals
  tabs: {},
  activeTabId: {},
  addTab: (accountId, tab) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [accountId]: [...(state.tabs[accountId] ?? []), tab]
      },
      activeTabId: {
        ...state.activeTabId,
        [accountId]: tab.id
      }
    })),
  closeTab: (accountId, tabId) =>
    set((state) => {
      const currentTabs = state.tabs[accountId]?.filter((t) => t.id !== tabId) ?? []
      const wasActive = state.activeTabId[accountId] === tabId
      return {
        tabs: { ...state.tabs, [accountId]: currentTabs },
        activeTabId: {
          ...state.activeTabId,
          [accountId]: wasActive
            ? (currentTabs[currentTabs.length - 1]?.id ?? '')
            : (state.activeTabId[accountId] ?? '')
        }
      }
    }),
  setActiveTab: (accountId, tabId) =>
    set((state) => ({
      activeTabId: { ...state.activeTabId, [accountId]: tabId }
    })),

  // UI
  showAddAccount: false,
  setShowAddAccount: (show) => set({ showAddAccount: show })
}))
