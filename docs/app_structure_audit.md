# Planifier App Structure Audit

> **⚠️ SUPERSEDED (2026-05-31).** This snapshot predates the chat-first split. It is kept for historical context only. Known inaccuracies: it lists an `/api/journal` route that does not exist, and it describes `/` as embedding `Chat.tsx` — the builder has since moved to `/plan/new` and `/` is now a landing/command screen. For the current source map and boundary rules, see [audits/project_workspace_audit_2026-05-31.md](audits/project_workspace_audit_2026-05-31.md) and the repo `README.md`.

Snapshot taken during the mobile-first planning pass. Used to identify what to rework first without doing the rework yet.

## Existing Routes

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Home + chat shell. Currently embeds the entire build-plan input form as a sidebar via `Chat.tsx`. Uses `max-w-6xl` and a 2-col grid (`lg:grid-cols-[320px_1fr]`) that **stacks vertically below `lg`** — usable on mobile but cluttered, single-screen-of-everything. |
| `/sign-in` | `app/sign-in/[[...sign-in]]/page.tsx` | Clerk component. |
| `/sign-up` | `app/sign-up/[[...sign-up]]/page.tsx` | Clerk component. |
| `/plans` | `app/plans/page.tsx` | Saved plans list. Needs review for mobile card layout. |
| `/plans/[id]` | `app/plans/[id]/page.tsx` | Plan detail + journal. |
| `/api/chat` | `app/api/chat/route.ts` | Streaming text via router (`pickModel({ task: "chat" })`). |
| `/api/plan` | `app/api/plan/route.ts` | Structured `generateObject` via router (`pickModel({ task: "plan" })`). |
| `/api/health` | `app/api/health/route.ts` | Public health probe with per-provider AI status. |
| `/api/plans` | `app/api/plans/*` | Plan CRUD (verified via `lib/db` usage). |
| `/api/journal` | `app/api/journal/*` | Journal entry CRUD. |

## Existing Components

| File | Role | Mobile state |
|---|---|---|
| `components/Chat.tsx` | Input panel + chat + structured-plan render | Desktop-first. 2-col grid. Long form sidebar. **Highest mobile-rework priority.** |
| `components/PlanView.tsx` | Renders the 7 plan sections + Strategy Notes + Pre-Trade Checklist banner | All sections always expanded. Needs `CollapsibleCard`. |
| `components/JournalForm.tsx` | Journal entry form | Needs full-screen mobile layout + keyboard-aware sticky CTA. |
| `components/Nav.tsx` | Top nav (sign-in state, link to plans) | Probably fine on mobile; needs a quick check at 320px. |

## CSS / Tailwind Structure

- `app/globals.css` — base body color + a `.prose-planifier` helper for chat markdown. Small surface, no risk.
- `tailwind.config.mjs` — semantic tokens already defined (`bg`, `panel`, `border`, `ink`, `muted`, `accent`, `danger`). Mobile-first responsive prefixes (`lg:`) used correctly. No theming framework on top.
- **Conclusion:** Tailwind setup already supports mobile-first changes. No infrastructure work needed before redesign.

## What Needs Mobile Redesign

| Priority | Screen / Component | Why |
|---|---|---|
| P0 | `Chat.tsx` (split apart) | One screen tries to do five things. Should become Home + multi-step Build Plan. |
| P0 | `PlanView.tsx` | Long unsegmented scroll. Needs `CollapsibleCard`. |
| P1 | `/plans` list | Currently likely renders as a list/table; needs `PlanCard`. |
| P1 | `JournalForm.tsx` | Needs full-screen mobile mode + draft autosave. |
| P2 | `/plans/[id]` detail | Header sticky-on-scroll, journal entries collapsed. |
| P2 | `Nav.tsx` | Quick small-screen sanity check. |
| P3 | New `/settings` route | Surface provider status from `/api/health`. |

## What Should Be Refactored First (concrete)

1. **Extract `CollapsibleCard` component.** Used by `PlanView` for sections 4–7. Persist open/closed state per section in localStorage. This is small, isolated, and unblocks everything else.
2. **Split `Chat.tsx`.** The input form and the chat/results display are two responsibilities. Move the form to a new `/plan/new` route with a stepper, keep `/` as a real landing/command screen.
3. **Add `PlanCard` for the saved-plans list.** Card layout, not table. Tap-area ≥ 88px tall.
4. **Promote the journal form to a full-screen mobile route.** Either a modal route group (`@modal/(.)journal/new`) or a dedicated `/plans/[id]/journal/new`.

None of the above adds runtime dependencies. All are layout / component refactors against the existing Tailwind tokens.

---

# Recommended Mobile UI Implementation Order

Ship one at a time. Each step is independently verifiable (build/typecheck/lint/test).

1. **Home screen polish** — replace `Chat.tsx` on `/` with a clean command screen: three large cards (Build New Plan, View Saved Plans, Open Journal). Move `Chat.tsx` to `/chat` or fold into the Build Plan flow. Smallest visible win.
2. **Build Plan stepper** — `/plan/new` with 5 steps as specified in `docs/app_screens.md`. Same inputs as today; just reorganized. Re-use `validateInputs` and the existing `/api/plan` route — no backend change.
3. **PlanView collapsible cards** — introduce `CollapsibleCard`, wrap sections 4 (Scenarios), 6 (Decision Checklist), 7 (Journal Prompt) initially. Keep Pre-Trade Checklist + Strategy Notes + Invalidation always open. Backward-compatible with legacy plans (already handled).
4. **Saved plans mobile cards** — replace whatever `/plans` renders with `PlanCard`. Add a "New plan" FAB linking to `/plan/new`.
5. **Journal form polish** — full-screen route on mobile, modal on desktop, draft autosave to localStorage, sticky save CTA.
6. **PWA manifest + icons** — *later*. Defer until the above five ship and the brand mark is locked.

## What This Pass Did Not Do

- No component code was rewritten.
- No routes were added.
- No dependencies were added.
- No native shell, no broker integration, no live price, no PDF export, no public share, no Capacitor/Expo/React Native.
- No DB schema changes.

All four design docs live under [docs/](../docs).
