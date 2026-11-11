import { Plus, X } from 'lucide-react'
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
        {tabs.map((tab) => {
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
              title={tab.title}
            >
              <span className="tab-item-label">{tab.title}</span>
              <span
                role="button"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
                className={`ml-auto flex size-5.5 shrink-0 items-center justify-center rounded-sm text-text-muted transition-opacity hover:bg-chrome-hover hover:text-text-secondary ${
                  isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'
                }`}
              >
                <X className="size-3.5" />
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={onNew}
          className="tab-item tab-item-icon"
          title="New terminal in folder…"
          aria-label="New terminal"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
