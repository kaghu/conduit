# shadcn/ui Chrome Migration (Phase 2)

## Goal

Adopt shadcn/ui as the only interactive UI kit in the renderer. Migrate all existing Radix/custom chrome (menus, login dialog, buttons, inputs) to shadcn components. Auth IPC and CLI behavior stay unchanged; the login popup and related controls get a full visual redesign.

## Non-goals

- Change `createAuthTerminal`, `.claude.json` polling, `oauthAccount` detection, or account CRUD IPC
- Restyle the xterm terminal canvas or terminal island (`#0f0f0f`)
- Redesign app grid layout (sidebar rail / titlebar / main panel) beyond swapping interactive controls
- Theme toggle / light-dark mode (Phase 3)

## Current state

- Direct Radix: `TitleBar` (`DropdownMenu`), `Sidebar` (`ContextMenu`)
- Custom modal: `AddAccountModal` (setup + auth steps) with hand-rolled overlay, inputs, buttons
- Design tokens in `src/renderer/styles/tokens/`; chrome utilities in `globals.css` (`.menu-surface`, `.modal-shell`, etc.)
- No `components.json` / shadcn scaffold yet

## Architecture

```
src/renderer/
├── components/
│   ├── ui/                 # shadcn primitives (owned copies)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── context-menu.tsx
│   │   └── separator.tsx
│   ├── TitleBar.tsx        # uses DropdownMenu + Button
│   ├── Sidebar.tsx         # uses ContextMenu + Button
│   └── AddAccountModal.tsx # uses Dialog + Button + Input + Label + Separator
├── lib/
│   └── utils.ts            # cn() helper
└── styles/
    ├── globals.css         # keep layout/drag; drop menu/modal chrome utilities once unused
    └── tokens/             # --ds-* remain source of truth; map shadcn CSS vars here
```

### Token mapping

Map shadcn semantic variables (`--background`, `--foreground`, `--primary`, `--destructive`, `--border`, `--radius`, etc.) onto existing `--ds-*` / `@theme` colors so platform chrome (light rails) and terminal island stay consistent. Do not introduce a second color system.

### Allowed config touches

shadcn typically needs path aliases (`@/…`). Touching `tsconfig*.json` / Vite alias config is allowed for this work (overrides the usual “do not touch” rule for this ticket only). Prefer aligning with electron-vite’s existing renderer resolve setup.

## Component migration

| Surface | Today | After |
|---------|--------|--------|
| TitleBar account switcher | `@radix-ui/react-dropdown-menu` + `.menu-surface` | shadcn `DropdownMenu` + `Button` trigger |
| Sidebar delete | `@radix-ui/react-context-menu` + `.menu-item` | shadcn `ContextMenu` |
| Add account / login popup | custom overlay + `.modal-shell` | shadcn `Dialog` (redesigned layout) |
| Nickname / actions | raw `<input>` / `<button>` | shadcn `Input`, `Label`, `Button` |
| Dividers | hand-rolled `h-px` / `.menu-separator` | shadcn `Separator` |

### Login popup redesign (behavior preserved)

Keep the two-step flow and all side effects:

1. **Setup** — alias, workspace folder pick, color presets, Login with email / Google  
2. **Auth** — embedded `TerminalView`, cancel closes PTY + deletes pending account, auto-close on `account:authenticated`

Change the **presentation**: Dialog chrome, typography hierarchy, primary/secondary button treatment, spacing — intentional redesign, not pixel parity with the current popup.

Color swatches remain small custom controls (dynamic hex via inline `style` is still allowed per project rules).

### Auth method buttons (setup step)

Replace the plain text row actions with full-width, properly styled provider buttons using shadcn `Button` + icons from **lucide-react** (shadcn’s default icon set).

| Button | Look | Icon |
|--------|------|------|
| **Continue with Google** | Embedded Google Sign-In style: light/white fill, subtle border, dark label, full width | Official multicolor Google “G” SVG (brand mark — Lucide has no Google logo; same pattern as common shadcn auth examples) |
| **Continue with email** | Secondary/outline `Button`, matching weight and size to Google | Lucide `Mail` |

Both buttons:
- Equal height, full width, stacked with consistent gap
- Leading icon + label (not text-only links)
- Same disabled / loading treatment while `isCreating`
- Still call existing `handleLogin('google' | 'email')` — no IPC changes

Do not invent a second icon library; use lucide-react everywhere else (chevron, plus, close, etc.).

### Layout out of scope for replacement

Keep existing shell CSS: `.application-shell`, `.sidebar-rail`, `.titlebar-drag` / `.titlebar-no-drag`, platform padding, tab bar, avatar indicator layout. Only interactive primitives move to shadcn.

## Dependency rules

- After migration: remove `@radix-ui/react-dropdown-menu` and `@radix-ui/react-context-menu` from `package.json` (shadcn pulls radix deps transitively as needed)
- Add `lucide-react` with shadcn scaffold (standard companion)
- No new direct Radix imports in app code — only via `components/ui/*`
- New interactive UI in Phase 2+ uses shadcn first

## Docs updates (same PR / task)

- `DESIGN.md` tech stack: add shadcn/ui  
- `DESIGN.md` Phase 2: add full chrome migration + login dialog redesign; align auth bullets with CLI-based flow already in the app  
- `CLAUDE.md` Styling: shadcn owns interactive chrome; tokens own layout/platform; forbid direct Radix in feature components

## Success criteria

1. Zero direct `@radix-ui/*` imports outside `components/ui/`
2. TitleBar, Sidebar, AddAccountModal composed from `components/ui/*`
3. Login popup visually redesigned with Dialog/Button/Input/Label; auth steps and IPC unchanged
4. Setup step has Google-styled OAuth button (brand “G”) and email button with Lucide `Mail`; both shadcn `Button`
5. Direct Radix packages removed from `package.json` once unused
6. Phase 2 docs list this migration

## Risks

- Path aliases / electron-vite resolver misconfig → broken imports in packaged builds; verify `npm run build`
- Over-restyling shell while changing dialogs → keep shell CSS stable; only redesign modal/menu surfaces
- Accidental auth regressions → do not touch main-process auth handlers in this work
