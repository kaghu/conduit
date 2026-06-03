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
    <div className="titlebar-no-drag flex items-center h-8 bg-neutral-200 border-b border-neutral-300 overflow-x-auto">
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
            className={`group flex items-center gap-1 h-full px-3 text-xs border-r border-neutral-300 transition-colors shrink-0 cursor-pointer ${
              isActive
                ? 'bg-neutral-300 text-neutral-800 font-medium'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-300/60'
            }`}
          >
            <span className="select-none">terminal {i + 1}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
              className="ml-0.5 p-0.5 rounded hover:bg-neutral-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
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
