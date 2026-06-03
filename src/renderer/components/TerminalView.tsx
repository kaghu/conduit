import { useTerminal } from '../hooks/useTerminal'

interface TerminalViewProps {
  terminalId: string
  visible: boolean
}

export function TerminalView({ terminalId, visible }: TerminalViewProps) {
  const containerRef = useTerminal({ terminalId, visible })

  return (
    <div
      ref={containerRef}
      className="xterm-container"
      style={{ display: visible ? 'block' : 'none' }}
    />
  )
}
