# Conduit — Multi-Account Claude Terminal Manager

## Overview

Conduit is a desktop app that lets you log into multiple Claude accounts simultaneously and run isolated Claude Code CLI sessions per account. The UX mirrors Slack workspaces: a left sidebar lists accounts, and the main area hosts tabbed terminals scoped to the selected account.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop shell | Electron 33+ | Cross-platform window, IPC, native menus |
| Renderer | React 18 + TypeScript | UI components |
| Build | Vite + electron-vite | Fast HMR, ESM-first |
| State | Zustand | Lightweight, no boilerplate |
| Styling | Tailwind CSS 4 | Utility-first, dark-mode support |
| UI kit | shadcn/ui | Interactive chrome (dialogs, menus, buttons, inputs) |
| Terminal emulation | xterm.js (`@xterm/xterm`) | Production-grade terminal renderer (same as VS Code) |
| Shell backend | `node-pty` | Spawn real PTY shells per tab |
| Secure storage | `keytar` | OS Keychain for credentials per account |
| IDs | `uuid` (v4) | Unique account/terminal identifiers |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Electron Main                     │
│                                                      │
│  AccountManager          TerminalManager             │
│  ├─ CRUD accounts        ├─ spawn node-pty per tab   │
│  ├─ keytar read/write    ├─ resize / kill            │
│  └─ auth flow            └─ env: CLAUDE_CONFIG_DIR   │
│                                                      │
│  AuthService             IPC Bridge                  │
│  ├─ BrowserWindow modal  ├─ account:* channels       │
│  ├─ session partition     ├─ terminal:* channels      │
│  └─ cookie intercept     └─ auth:* channels           │
│                                                      │
├──────────────── preload (contextBridge) ─────────────┤
│  window.conduit = { account, terminal, auth }        │
├──────────────── Renderer (React + Vite) ─────────────┤
│                                                      │
│  ┌──────┐  ┌──────────────────────────────────────┐  │
│  │ Side │  │           Terminal Area               │  │
│  │ bar  │  │  ┌─ Tab Bar ──────────────── [+] ─┐  │  │
│  │      │  │  │  Tab 1 │ Tab 2 │ Tab 3          │  │  │
│  │ Acct │  │  ├─────────────────────────────────┤  │  │
│  │  A   │  │  │                                 │  │  │
│  │      │  │  │         xterm.js canvas          │  │  │
│  │ Acct │  │  │                                 │  │  │
│  │  B   │  │  │                                 │  │  │
│  │      │  │  └─────────────────────────────────┘  │  │
│  │ [+]  │  │                                      │  │
│  └──────┘  └──────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Account Isolation

Each account gets its own filesystem namespace so Claude CLI sessions never cross-contaminate:

```
~/.conduit/
├── accounts/
│   ├── <uuid-a>/          # Account A config dir
│   │   ├── credentials.json
│   │   ├── settings.json
│   │   └── ...            # Claude CLI writes its own state here
│   └── <uuid-b>/          # Account B config dir
│       └── ...
└── conduit.json           # App-level config (account list, UI prefs)
```

When spawning a terminal for Account A, the main process sets:

```ts
const pty = spawn(shell, [], {
  env: {
    ...process.env,
    CLAUDE_CONFIG_DIR: path.join(homedir, '.conduit', 'accounts', accountId),
  },
});
```

This ensures `claude` CLI reads/writes credentials and state from the account-specific directory.

---

## Data Model

### Account

```ts
interface Account {
  id: string;           // UUID v4
  alias: string;        // User-chosen display name ("Work", "Personal")
  color: string;        // Hex color for sidebar avatar
  email: string;        // Login email (display only)
  authMethod: 'email' | 'google';
  createdAt: string;    // ISO 8601
}
```

### Terminal Tab

```ts
interface TerminalTab {
  id: string;           // UUID v4
  accountId: string;    // FK → Account.id
  title: string;        // Auto-set from shell or user-renamed
  createdAt: string;
}
```

### App Config (`conduit.json`)

```ts
interface AppConfig {
  accounts: Account[];
  activeAccountId: string | null;
  ui: {
    sidebarWidth: number;
    theme: 'dark' | 'light';
  };
}
```

Credentials (session cookies, API keys) are **never** stored in `conduit.json`. They live in the OS keychain via `keytar` with service name `conduit` and account key `account:<uuid>`.

---

## IPC Channels

All renderer ↔ main communication goes through typed IPC channels via `contextBridge`.

### Account channels

| Channel | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `account:list` | renderer → main | — | Get all accounts |
| `account:create` | renderer → main | `{ alias, color, email, authMethod }` | Create account, returns `Account` |
| `account:update` | renderer → main | `{ id, alias?, color? }` | Update account metadata |
| `account:delete` | renderer → main | `{ id }` | Delete account + keychain entry + config dir |

### Terminal channels

| Channel | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `terminal:create` | renderer → main | `{ accountId }` | Spawn PTY, returns `{ terminalId }` |
| `terminal:write` | renderer → main | `{ terminalId, data }` | Send keystrokes to PTY |
| `terminal:resize` | renderer → main | `{ terminalId, cols, rows }` | Resize PTY |
| `terminal:data` | main → renderer | `{ terminalId, data }` | PTY output stream |
| `terminal:exit` | main → renderer | `{ terminalId, code }` | PTY process exited |
| `terminal:close` | renderer → main | `{ terminalId }` | Kill PTY and clean up |

### Auth channels

| Channel | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `auth:start` | renderer → main | `{ accountId, method }` | Open auth modal window |
| `auth:success` | main → renderer | `{ accountId }` | Auth completed, credentials stored |
| `auth:error` | main → renderer | `{ accountId, error }` | Auth failed |

---

## Authentication Flow

### Email Login

1. User fills in alias, picks a color, selects "Email" auth method.
2. Renderer sends `auth:start` with `method: 'email'`.
3. Main process opens a **frameless BrowserWindow** pointed at `https://claude.ai/login`.
   - Uses an **isolated session partition** (`persist:account-<uuid>`) so cookies don't leak across accounts.
4. Main process attaches a `webRequest.onCompleted` listener watching for the session cookie (`sessionKey` or similar) on `claude.ai` responses.
5. On cookie capture:
   - Store the cookie/token in OS keychain via `keytar.setPassword('conduit', 'account:<uuid>', token)`.
   - Write a minimal `credentials.json` to the account's config dir (so Claude CLI can use it).
   - Close the auth window.
   - Send `auth:success` to renderer.

### Google OAuth Login

Same flow — the BrowserWindow follows Google's OAuth redirect within the `claude.ai` domain. The isolated partition ensures Google sessions don't collide across accounts.

---

## UI Components

### 1. Welcome / Add Account Screen

Shown on first launch or when clicking [+] in the sidebar.

```
┌──────────────────────────────────────────┐
│         Add Claude Account               │
│                                          │
│  Alias:    [___________________]         │
│                                          │
│  Color:    ● ● ● ● ● ● ● ●  [custom]   │
│                                          │
│  ──────────── Login Method ────────────  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │   📧  Continue with Email        │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │   🔵  Continue with Google       │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

**Fields:**
- **Alias** — text input, required, max 24 chars.
- **Color** — 8 preset swatches + custom hex picker. Used as the sidebar avatar background.
- **Login method** — two buttons that kick off the auth flow.

### 2. Sidebar (Account Switcher)

```
┌────────┐
│  ┌──┐  │
│  │NA│  │  ← Account avatar (initials on colored bg)
│  └──┘  │
│  ┌──┐  │
│  │WK│  │
│  └──┘  │
│        │
│        │
│        │
│  ┌──┐  │
│  │ +│  │  ← Add account button
│  └──┘  │
└────────┘
```

- Each account rendered as a **circle avatar** with 1-2 letter initials on the account's chosen color.
- Active account has a **white left border indicator** (like Slack).
- Click to switch. Right-click for context menu (Edit, Delete).
- [+] at bottom opens the Add Account screen.

### 3. Terminal Area

```
┌─────────────────────────────────────────────┐
│ Account: "Work" (email@example.com)          │
├──────────────────────────────────── [+] ─────┤
│  Tab 1  │  Tab 2  │  Tab 3  │               │
├─────────────────────────────────────────────┤
│                                              │
│  $ claude                                    │
│  Claude Code v1.x                            │
│  > _                                         │
│                                              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

- **Header bar** shows the active account alias and email.
- **Tab bar** with a [+] button to spawn a new terminal for this account.
- Each tab has a close [×] button. Middle-click also closes.
- Tabs are **draggable** to reorder.
- Terminal canvas rendered by xterm.js with the `FitAddon` for auto-resize.
- Default shell: user's `$SHELL` (or `bash` fallback).
- On tab creation, optionally auto-run `claude` to start a Claude Code session.

### 4. Component Tree

```
<App>
  <Sidebar>
    <AccountAvatar />     ← per account
    <AddAccountButton />
  </Sidebar>
  <MainArea>
    <AccountHeader />
    <TabBar>
      <Tab />              ← per terminal
      <NewTabButton />
    </TabBar>
    <TerminalView />       ← xterm.js instance
  </MainArea>
  <AddAccountModal />      ← overlay when adding account
</App>
```

---

## State Management (Zustand)

```ts
interface AppState {
  // Accounts
  accounts: Account[];
  activeAccountId: string | null;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  setActiveAccount: (id: string) => void;

  // Terminals (per account)
  tabs: Record<string, TerminalTab[]>;  // accountId → tabs
  activeTabId: Record<string, string>;  // accountId → active tab id
  addTab: (accountId: string) => void;
  closeTab: (accountId: string, tabId: string) => void;
  setActiveTab: (accountId: string, tabId: string) => void;
}
```

---

## Project Structure

```
conduit/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
│
├── src/
│   ├── main/                          # Electron main process
│   │   ├── index.ts                   # App entry, window creation
│   │   ├── ipc.ts                     # IPC handler registration
│   │   ├── account-manager.ts         # Account CRUD, config file I/O
│   │   ├── terminal-manager.ts        # node-pty lifecycle
│   │   ├── auth-service.ts            # Auth window, cookie capture, keytar
│   │   └── keychain.ts                # keytar wrapper
│   │
│   ├── preload/
│   │   └── index.ts                   # contextBridge → window.conduit
│   │
│   └── renderer/                      # React app
│       ├── index.html
│       ├── main.tsx                   # React entry
│       ├── App.tsx
│       ├── store.ts                   # Zustand store
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── AccountAvatar.tsx
│       │   ├── MainArea.tsx
│       │   ├── TabBar.tsx
│       │   ├── Tab.tsx
│       │   ├── TerminalView.tsx       # xterm.js integration
│       │   ├── AddAccountModal.tsx
│       │   └── AccountHeader.tsx
│       ├── hooks/
│       │   ├── useTerminal.ts         # xterm.js + IPC bridge
│       │   └── useAccounts.ts         # Account IPC bridge
│       └── styles/
│           └── globals.css            # Tailwind imports, xterm overrides
│
├── resources/                         # App icons, assets
│   └── icon.png
│
└── electron-builder.yml               # Packaging config
```

---

## Key Implementation Details

### Terminal Lifecycle

1. **Create:** Renderer calls `window.conduit.terminal.create(accountId)`. Main spawns `node-pty` with `CLAUDE_CONFIG_DIR` set, returns `terminalId`.
2. **Data flow:** Main streams PTY output via `terminal:data`. Renderer writes keystrokes via `terminal:write`. xterm.js handles rendering and input parsing.
3. **Resize:** `FitAddon` calculates cols/rows on container resize → sends `terminal:resize` → main calls `pty.resize(cols, rows)`.
4. **Close:** User closes tab → renderer sends `terminal:close` → main kills PTY → main sends `terminal:exit`.

### Security Considerations

- **No credentials in renderer.** All keytar and credential file operations happen in main process only.
- **Context isolation enabled.** `contextIsolation: true`, `nodeIntegration: false` in BrowserWindow options.
- **Isolated partitions.** Each account's auth window uses a separate Electron session partition to prevent cookie leakage.
- **No remote module.** All cross-process calls go through typed IPC.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + T` | New terminal tab |
| `Cmd/Ctrl + W` | Close current tab |
| `Cmd/Ctrl + Tab` | Next tab |
| `Cmd/Ctrl + Shift + Tab` | Previous tab |
| `Cmd/Ctrl + 1-9` | Switch to tab N |
| `Cmd/Ctrl + Shift + ]` / `[` | Next / previous account |
| `Cmd/Ctrl + N` | Add new account |

---

## Build & Package

```bash
# Development
npm run dev          # Starts Electron with HMR

# Production
npm run build        # Compile main + renderer
npm run package      # electron-builder → .dmg / .exe / .AppImage
```

Target platforms: macOS (primary), Windows, Linux.

---

## Phase Plan

### Phase 1 — Shell (MVP)
- Electron window with sidebar + terminal area
- Add/remove accounts (alias + color, no auth yet)
- Spawn terminals with `CLAUDE_CONFIG_DIR` isolation
- xterm.js rendering with fit/resize
- Tab management (create, close, switch)
- Persist accounts to `conduit.json`

### Phase 2 — Auth
- Auth via `createAuthTerminal` (Claude CLI) + poll `.claude.json` for `oauthAccount`
- Email / Google login entry points in the Connect account dialog (CLI completes the flow)
- Auto-run `claude` on new terminal tab after auth
- **shadcn/ui chrome migration** — add shadcn + lucide-react; migrate TitleBar dropdown, Sidebar context menu, and Add Account / login dialog to `components/ui/*`; redesign login popup (Dialog, Button, Input, Label) with Google Sign-In–style button and email button (`Mail` icon); remove direct `@radix-ui/*` app imports (see `docs/superpowers/specs/2026-07-15-shadcn-chrome-migration-design.md`)

### Phase 3 — Polish
- Drag-to-reorder tabs
- Account edit/delete with confirmation
- Dark/light theme toggle
- Keyboard shortcuts
- Window state persistence (size, position, active account/tab)
- System tray / dock integration

### Phase 4 — Distribution
- Code signing (macOS notarization, Windows signing)
- Auto-update via `electron-updater`
- Crash reporting
- Analytics (opt-in)
