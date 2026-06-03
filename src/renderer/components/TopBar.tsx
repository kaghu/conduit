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
    <div className="titlebar-drag relative flex items-center h-7 border-b border-[#d1d1d1] bg-[#ececec] shrink-0 select-none">

      {/* Tabs — left side, scrollable */}
      <div className="titlebar-no-drag flex items-center h-full overflow-x-auto z-10">
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) { e.preventDefault(); onClose(tab.id) }
              }}
              className={`group relative flex items-center gap-1 h-full px-3 text-[11px] transition-colors shrink-0 cursor-pointer border-r border-[#d1d1d1] ${
                isActive
                  ? 'text-[#111] font-medium bg-[#e0e0e0]'
                  : 'text-[#666] hover:text-[#333] hover:bg-[#e6e6e6]'
              }`}
            >
              terminal {i + 1}
              <span
                onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 ml-0.5 leading-none transition-opacity"
              >
                ×
              </span>
            </button>
          )
        })}

        {/* New tab */}
        <button
          onClick={onNew}
          className="flex items-center justify-center h-full px-2.5 text-[#888] hover:text-[#333] text-base leading-none cursor-pointer hover:bg-[#e6e6e6] transition-colors border-r border-[#d1d1d1]"
          title="New terminal (⌘T)"
        >
          +
        </button>
      </div>

    </div>
  )
}
