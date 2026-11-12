import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { Sidebar } from './components/Sidebar'
import { MainArea } from './components/MainArea'
import { AddAccountModal } from './components/AddAccountModal'
import { WelcomePage } from './components/WelcomePage'

export function App() {
  const { setAccounts, setActiveAccount, showAddAccount, accounts, activeAccountId } =
    useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  // Keep the native Accounts menu in sync with the store.
  useEffect(() => {
    window.conduit.menu.sync({
      accounts: accounts.map(({ id, alias }) => ({ id, alias })),
      activeAccountId
    })
  }, [accounts, activeAccountId])

  // Handle native menu clicks (read fresh state via getState to avoid re-subscribing).
  useEffect(() => {
    return window.conduit.menu.onAction(async (action) => {
      const s = useAppStore.getState()
      if (s.accounts.length === 0) return
      if (action.type === 'select-account') s.setActiveAccount(action.accountId)
      else if (action.type === 'add-account') s.setShowAddAccount(true)
      else {
        for (const tab of s.tabs[action.accountId] ?? []) window.conduit.terminal.close(tab.id)
        await window.conduit.account.delete(action.accountId)
        s.removeAccount(action.accountId)
      }
    })
  }, [])

  useEffect(() => {
    window.conduit.account.list().then((accounts) => {
      setAccounts(accounts)
      if (accounts.length > 0) {
        setActiveAccount(accounts[0].id)
      }
      setIsLoading(false)
    })
  }, [setAccounts, setActiveAccount])

  if (isLoading) {
    return <div className="flex h-full w-full bg-terminal" />
  }

  if (accounts.length === 0) {
    return <WelcomePage />
  }

  return (
    <div className="application-shell">
      <Sidebar />
      <MainArea />
      {showAddAccount && <AddAccountModal />}
    </div>
  )
}
