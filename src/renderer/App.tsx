import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { Sidebar } from './components/Sidebar'
import { MainArea } from './components/MainArea'
import { AddAccountModal } from './components/AddAccountModal'
import { WelcomePage } from './components/WelcomePage'
import { TitleBar } from './components/TitleBar'

export function App() {
  const { setAccounts, setActiveAccount, showAddAccount, accounts } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

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
      <TitleBar />
      <Sidebar />
      <MainArea />
      {showAddAccount && <AddAccountModal />}
    </div>
  )
}
