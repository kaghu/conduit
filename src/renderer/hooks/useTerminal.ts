import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface UseTerminalOptions {
  terminalId: string
  visible: boolean
}

export function useTerminal({ terminalId, visible }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current || !terminalId) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
      theme: {
        background: '#0f0f0f',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
        selectionBackground: '#3f3f4680',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa'
      },
      allowProposedApi: true
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)

    // Small delay to ensure container is laid out before fitting
    requestAnimationFrame(() => {
      fit.fit()
      window.conduit.terminal.resize(terminalId, term.cols, term.rows)
    })

    // Send keystrokes to the PTY
    term.onData((data) => {
      window.conduit.terminal.write(terminalId, data)
    })

    // Receive PTY output
    const removeDataListener = window.conduit.terminal.onData((id, data) => {
      if (id === terminalId) {
        term.write(data)
      }
    })

    // Handle PTY exit
    const removeExitListener = window.conduit.terminal.onExit((id, _code) => {
      if (id === terminalId) {
        term.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n')
      }
    })

    termRef.current = term
    fitRef.current = fit

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (fitRef.current && termRef.current) {
        fitRef.current.fit()
        window.conduit.terminal.resize(terminalId, termRef.current.cols, termRef.current.rows)
      }
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      removeDataListener()
      removeExitListener()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId])

  // Re-fit when visibility changes
  useEffect(() => {
    if (visible && fitRef.current && termRef.current) {
      requestAnimationFrame(() => {
        fitRef.current?.fit()
        if (termRef.current) {
          window.conduit.terminal.resize(terminalId, termRef.current.cols, termRef.current.rows)
        }
        termRef.current?.focus()
      })
    }
  }, [visible, terminalId])

  return containerRef
}
