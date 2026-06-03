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
    return <div className="flex h-full w-full bg-zinc-950" />
  }

  if (accounts.length === 0) {
    return <WelcomePage />
  }

  return (
    <div className="flex flex-col h-full w-full">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MainArea />
      </div>
      {showAddAccount && <AddAccountModal />}
    </div>
  )
}
