# shadcn Chrome Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate interactive chrome to shadcn/ui and redesign the login dialog (Google + email buttons), without changing auth IPC.

**Architecture:** Scaffold shadcn under `src/renderer/components/ui` with `@/` → `src/renderer`; map shadcn CSS vars to existing `--ds-*` tokens; replace TitleBar/Sidebar/AddAccountModal; remove direct Radix app deps and unused menu/modal CSS.

**Tech Stack:** shadcn/ui (Radix primitives), lucide-react, class-variance-authority, clsx, tailwind-merge, Tailwind 4, React 19

## Global Constraints

- Auth IPC / `createAuthTerminal` / `.claude.json` polling unchanged
- No direct `@radix-ui/*` imports outside `src/renderer/components/ui/`
- Token mapping only — no second color system
- Keep shell layout CSS (`.application-shell`, `.titlebar-drag`, `.sidebar-rail`, tabs, avatars)
- Inline `style=` only for dynamic avatar/hex colors
- Do not commit unless the user asks (user rule overrides plan commit steps)

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `src/renderer/lib/utils.ts` | `cn()` helper |
| `src/renderer/components/ui/*.tsx` | shadcn primitives |
| `src/renderer/components/icons/GoogleIcon.tsx` | Multicolor Google G mark |
| `src/renderer/styles/tokens/base.css` | Map shadcn CSS vars → `--ds-*` |
| `src/renderer/components/{TitleBar,Sidebar,AddAccountModal}.tsx` | Consumers |
| `electron.vite.config.ts` + `tsconfig.web.json` | `@` alias |
| `components.json` | shadcn config |
| `package.json` | deps |

---

### Task 1: Scaffold aliases, utils, dependencies, tokens

**Files:**
- Create: `src/renderer/lib/utils.ts`, `components.json`
- Modify: `electron.vite.config.ts`, `tsconfig.web.json`, `src/renderer/styles/tokens/base.css`, `package.json`

- [ ] **Step 1: Add path alias `@` → `src/renderer`**

In `electron.vite.config.ts`, add `path` resolve for renderer:

```ts
import { resolve } from 'path'
// inside renderer:
resolve: {
  alias: {
    '@': resolve('src/renderer')
  }
}
```

In `tsconfig.web.json` `compilerOptions`:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["src/renderer/*"]
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-dropdown-menu @radix-ui/react-context-menu
```

Keep existing radix packages until Task 6 removes the old top-level duplicates if any.

- [ ] **Step 3: Create `cn` helper**

`src/renderer/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Write `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/renderer/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 5: Map shadcn CSS variables in `base.css` `:root`**

Add after existing `:root` block (or inside it):

```css
--background: var(--ds-surface);
--foreground: var(--ds-text-primary);
--card: var(--ds-surface-elevated);
--card-foreground: var(--ds-text-primary);
--popover: var(--ds-surface-elevated);
--popover-foreground: var(--ds-text-primary);
--primary: var(--ds-text-primary);
--primary-foreground: var(--ds-surface);
--secondary: var(--ds-surface-muted);
--secondary-foreground: var(--ds-text-secondary);
--muted: var(--ds-surface-muted);
--muted-foreground: var(--ds-text-muted);
--accent: var(--ds-surface-hover);
--accent-foreground: var(--ds-text-primary);
--destructive: var(--ds-danger);
--border: var(--ds-chrome-border);
--input: var(--ds-chrome-border);
--ring: var(--ds-border-focus);
--radius: var(--ds-radius-md);
```

And in `@theme` add color bridges if needed for Tailwind utilities used by shadcn:

```css
--color-background: var(--background);
--color-foreground: var(--foreground);
--color-card: var(--card);
--color-card-foreground: var(--card-foreground);
--color-popover: var(--popover);
--color-popover-foreground: var(--popover-foreground);
--color-primary: var(--primary);
--color-primary-foreground: var(--primary-foreground);
--color-secondary: var(--secondary);
--color-secondary-foreground: var(--secondary-foreground);
--color-muted: var(--muted);
--color-muted-foreground: var(--muted-foreground);
--color-accent: /* careful: project already has --color-accent for brand */;
```

**Important:** Existing `--color-accent` is brand accent (`#555`). shadcn “accent” is hover surface. Map shadcn accent via `--color-accent-ui` / use raw `bg-accent` with a differently named token. Prefer adding:

```css
--color-popover: ...
--color-primary: ...
--color-destructive: var(--destructive);
--color-muted: ...
--color-muted-foreground: ...
--color-secondary: ...
--color-secondary-foreground: ...
--color-input: ...
--color-ring: ...
--color-background: ...
--color-foreground: ...
```

Do **not** overwrite existing `--color-accent` (brand). In Button/cva use `bg-[var(--accent)]` or register `--color-ui-accent: var(--accent)` and use `bg-ui-accent` in components.

**Verify:** `npx tsc -p tsconfig.web.json --noEmit` resolves `@/lib/utils` after files exist.

---

### Task 2: Add shadcn UI primitives + Google icon

**Files:**
- Create: `button.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx`, `separator.tsx`, `dropdown-menu.tsx`, `context-menu.tsx` under `src/renderer/components/ui/`
- Create: `src/renderer/components/icons/GoogleIcon.tsx`

- [ ] **Step 1: Add standard new-york shadcn components** using `@/lib/utils` and `cn`. Prefer official CLI:

```bash
npx shadcn@latest add button input label dialog separator dropdown-menu context-menu --yes
```

If CLI path fails, hand-write equivalent new-york components. Style tokens: use `bg-background`, `text-foreground`, `border-border`, `bg-popover`, `text-destructive` mapped in Task 1. Where shadcn defaults use `bg-accent`, map to a name that does not clash with brand `--color-accent` (e.g. `bg-[var(--accent)]`).

- [ ] **Step 2: Google brand icon**

```tsx
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
```

**Verify:** Typecheck / import each UI file from a scratch — or proceed to Task 3 and catch via build.

---

### Task 3: Migrate TitleBar to DropdownMenu

**Files:**
- Modify: `src/renderer/components/TitleBar.tsx`

- [ ] **Step 1: Replace Radix import with `@/components/ui/dropdown-menu` and `Button`**
- [ ] **Step 2: Use Lucide `ChevronDown` for caret**
- [ ] **Step 3: Keep logout behavior identical; restyle with DropdownMenuItem / Separator / Label**

**Verify:** App opens; account switcher menu works; Sign out still deletes account.

---

### Task 4: Migrate Sidebar to ContextMenu + Button

**Files:**
- Modify: `src/renderer/components/Sidebar.tsx`

- [ ] **Step 1: Replace ContextMenu with shadcn**
- [ ] **Step 2: Add-account control uses `Button` variant ghost/outline + Lucide `Plus`** (retain `.sidebar-account-tile` layout classes as needed)

**Verify:** Right-click delete + Add account still work.

---

### Task 5: Redesign AddAccountModal (Dialog + auth buttons)

**Files:**
- Modify: `src/renderer/components/AddAccountModal.tsx`

- [ ] **Step 1: Wrap setup + auth steps in Dialog** (`open` always true while mounted; `onOpenChange` only closes when `canClose`)
- [ ] **Step 2: Input + Label for nickname; Button for Choose folder; Separator before auth methods**
- [ ] **Step 3: Full-width Google button (`variant` custom / outline white) with `GoogleIcon` + “Continue with Google”**
- [ ] **Step 4: Full-width outline Button + Lucide `Mail` + “Continue with email”**
- [ ] **Step 5: Auth step: Dialog with TerminalView; Cancel Button; pulse status — same handleCancel / onAuthenticated logic**

**Verify:** Create account → auth terminal → success closes; Cancel cleans up; Google/email both call same handlers.

---

### Task 6: Cleanup CSS and package.json

**Files:**
- Modify: `src/renderer/styles/globals.css` — remove `.modal-shell`, `.modal-overlay`, `.menu-surface`, `.menu-item*`, `.menu-label`, `.menu-separator` if unused
- Modify: `package.json` — remove top-level `@radix-ui/react-dropdown-menu` / `@radix-ui/react-context-menu` only if still listed separately as app deps and transitive copy remains via ui components (keep whatever `components/ui` needs)

- [ ] **Step 1: Grep for removed class names; delete unused rules**
- [ ] **Step 2: Grep for `@radix-ui` outside `components/ui` — must be empty**
- [ ] **Step 3: `npm run build` — expect success**

---

### Task 7: Docs already updated — spot-check

- [ ] Confirm `DESIGN.md` / `CLAUDE.md` / spec still match shipped UI (docs were updated during brainstorming)

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Scaffold + token map | 1 |
| UI primitives | 2 |
| TitleBar / Sidebar migrate | 3–4 |
| Login redesign + Google/email buttons | 5 |
| Remove direct Radix app imports / unused CSS | 6 |
| Docs Phase 2 | already done / 7 |
| Auth IPC unchanged | constraint — Tasks 3–5 must not touch `src/main` |
