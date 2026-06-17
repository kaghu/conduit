import type { TerminalTab } from '../../shared/types'

interface TopBarProps {
  tabs: TerminalTab[]
  activeTabId: string
  onSelect: (tabId: string) => void
  onClose: (tabId: string) => void
  onNew: () => void
}

export function TopBar({ tabs, activeTabId, onSelect, onClose, onNew }: TopBarProps) {
  return (
    <div className="titlebar-drag tab-bar shrink-0 select-none">
      <div className="titlebar-no-drag flex items-center h-full overflow-x-auto">
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
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 leading-none transition-opacity text-text-muted"
              >
                ×
              </span>
            </button>
          )
        })}

        <button
          onClick={onNew}
          className="tab-item text-base leading-none hover:bg-chrome-hover"
          title="New terminal (⌘T)"
        >
          +
        </button>
      </div>
    </div>
  )
}
