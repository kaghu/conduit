import { useCallback } from 'react'
import { useAppStore } from '../store'
import { TopBar } from './TopBar'
import { TerminalView } from './TerminalView'

export function MainArea() {
  const { accounts, activeAccountId, tabs, activeTabId, addTab, closeTab, setActiveTab } =
    useAppStore()

  const activeAccount = accounts.find((a) => a.id === activeAccountId)
  const accountTabs = activeAccountId ? (tabs[activeAccountId] ?? []) : []
  const currentTabId = activeAccountId ? (activeTabId[activeAccountId] ?? '') : ''

  const handleNewTab = useCallback(async () => {
    if (!activeAccountId) return
    const terminalId = await window.conduit.terminal.create(activeAccountId)
    addTab(activeAccountId, {
      id: terminalId,
      accountId: activeAccountId,
      title: 'Terminal',
      createdAt: new Date().toISOString()
    })
  }, [activeAccountId, addTab])

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (!activeAccountId) return
      window.conduit.terminal.close(tabId)
      closeTab(activeAccountId, tabId)
    },
    [activeAccountId, closeTab]
  )

  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (!activeAccountId) return
      setActiveTab(activeAccountId, tabId)
    },
    [activeAccountId, setActiveTab]
  )

  if (!activeAccount) {
    return (
      <main className="main-panel flex items-center justify-center bg-terminal container-pad">
        <p className="text-sm text-terminal-text">Select an account</p>
      </main>
    )
  }

  return (
    <main className="main-panel bg-terminal panel-chrome">
      <TopBar
        tabs={accountTabs}
        activeTabId={currentTabId}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
        onNew={handleNewTab}
      />

      <div className="panel-chrome-body flex-1 relative overflow-hidden">
        {accountTabs.length === 0 ? (
          <div className="flex items-center justify-center h-full container-pad">
            <button
              onClick={handleNewTab}
              className="text-sm text-terminal-text hover:text-terminal-text-hover border border-terminal-border px-4 py-2 rounded-sm transition-colors cursor-pointer"
            >
              Open terminal
            </button>
          </div>
        ) : (
          accountTabs.map((tab) => (
            <TerminalView
              key={tab.id}
              terminalId={tab.id}
              visible={tab.id === currentTabId}
            />
          ))
        )}
      </div>
    </main>
  )
}
