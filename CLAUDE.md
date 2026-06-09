# Conduit

Multi-account Claude terminal manager. Electron + React 19 + TypeScript + Tailwind 4 + Zustand + xterm.js + node-pty.

## Critical rules

**Process boundary** — renderer has no Node.js access. All cross-process calls go through `window.conduit` (preload/contextBridge). Never use `require('electron')` or `require('node:fs')` in renderer. Never use `ipcRenderer` directly.

**New IPC channel** → update `ConduitAPI` in `types.ts`, register in `ipc.ts`, expose in `preload/index.ts`. Channel naming: `domain:action`.

**node-pty** → always `require('node-pty')` at runtime, never ESM import.

**State** → all shared UI state in Zustand store (`store.ts`). No local state for anything other components read.

**Credentials** → never in renderer, never in `conduit.json`. Auth state lives in `~/.conduit/accounts/<uuid>/.claude.json` (written by Claude CLI). `oauthAccount` field = authenticated.

## Do not

- Add `nodeIntegration: true` or `contextIsolation: false`
- Use `remote` module
- Add npm dependencies without a reason
- Touch `electron.vite.config.ts` or `tsconfig*.json` unless the ticket requires it
- Use `any` without a comment

## Styling

Tailwind 4 only. Dark-first. No inline `style=` except dynamic hex colors (avatars). Terminal bg is `#0f0f0f`. Platform UI differences via `data-platform` on `<html>` — macOS: Apple HIG / SF Pro, Windows: Fluent / Segoe UI, Linux: GNOME HIG / Inter.

## Current phase

Phase 2 (Auth) — auth flow spawns `claude` CLI via `createAuthTerminal`, polls `.claude.json` for `oauthAccount`. Phase 1 (shell, terminals, account CRUD) is complete. Phase 3 (polish) and Phase 4 (distribution) not started.
