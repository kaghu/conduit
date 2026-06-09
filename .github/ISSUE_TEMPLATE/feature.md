---
name: Feature / Task
about: A task for Claude to implement
title: "[SHORT IMPERATIVE DESCRIPTION]"
labels: ""
assignees: ""
---

## What
<!-- One sentence: what should exist or work differently when this is done -->

## Why
<!-- Why this matters. What problem it solves or what value it adds -->

## Acceptance Criteria
- [ ] <!-- Specific, verifiable outcome -->
- [ ] <!-- Another outcome -->
- [ ] <!-- Add as many as needed -->

## Platform
<!-- Which platform(s) this touches -->
- [ ] darwin (macOS)
- [ ] win32 (Windows)
- [ ] linux (Ubuntu/GNOME)

## Scope
<!-- Which layer(s) are involved — check all that apply -->
- [ ] `src/main` — Electron main process (IPC, account-manager, terminal-manager)
- [ ] `src/preload` — contextBridge API surface
- [ ] `src/renderer` — React UI (components, hooks, store)
- [ ] `src/shared/types.ts` — shared types
- [ ] Styling / Tailwind
- [ ] Build / packaging

## Context for Claude
<!-- Anything Claude needs to know that isn't obvious from the codebase -->
<!-- e.g. "Don't touch terminal-manager.ts", "Follow the pattern in useTerminal.ts", -->
<!-- "This is blocked by #12 so assume X is already done" -->

## Size
<!-- Expected effort — helps with model selection -->
- [ ] XS (< 30 min, trivial change)
- [ ] S (30–90 min, single file or component)
- [ ] M (2–4 h, multiple files, some coordination)
- [ ] L (4 h+, architectural change — consider splitting)
