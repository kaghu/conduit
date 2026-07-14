# Conduit

Multi-account Claude terminal manager for macOS, Windows, and Linux.

Conduit is a desktop app that lets you sign into multiple Claude accounts and run isolated Claude Code CLI sessions in tabbed terminals — one sidebar per account, like Slack workspaces.

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and available on your `PATH`

## Install

```bash
npm install
```

## Develop

```bash
npm run dev
```

Starts Electron with hot reload.

## Build

```bash
npm run build
```

Compiles main, preload, and renderer into `out/`.

### Package a distributable

```bash
npm run package
```

Creates platform-specific installers via electron-builder (output depends on your OS).

## Preview a production build

```bash
npm run build
npm run preview
```

## Stack

Electron · React 19 · TypeScript · Tailwind 4 · Zustand · xterm.js · node-pty
