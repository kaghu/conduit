import type { TerminalTab } from '../../shared/types'

interface TabBarProps {
  tabs: TerminalTab[]
  activeTabId: string
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
  onNew: () => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onNew }: TabBarProps) {
  return (
    <div className="titlebar-no-drag tab-bar overflow-x-auto">
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                onClose(tab.id)
              }
            }}
            className={`tab-item group ${isActive ? 'tab-item-active' : ''}`}
          >
            <span className="select-none">terminal {i + 1}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
              className="ml-0.5 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </span>
          </button>
        )
      })}
    </div>
  )
}
