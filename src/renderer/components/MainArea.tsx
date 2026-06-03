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
      <div className="flex-1 flex items-center justify-center bg-black">
        <p className="text-[12px] text-[#666]">Select an account</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-black">
      <TopBar
        tabs={accountTabs}
        activeTabId={currentTabId}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
        onNew={handleNewTab}
      />

      {/* Terminal views */}
      <div className="flex-1 relative overflow-hidden">
        {accountTabs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={handleNewTab}
              className="text-[11px] text-[#666] hover:text-white border border-[#333] px-3 py-1.5 rounded transition-colors cursor-pointer"
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
    </div>
  )
}
