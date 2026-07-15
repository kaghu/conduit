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
      <div className="titlebar-no-drag flex h-full min-h-0 items-stretch overflow-x-auto overflow-y-hidden">
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  onClose(tab.id)
                }
              }}
              className={`tab-item group ${isActive ? 'tab-item-active' : ''}`}
            >
              <span className="select-none leading-none">terminal {i + 1}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
                className="leading-none text-text-muted opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              >
                ×
              </span>
            </button>
          )
        })}

        <button
          type="button"
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
