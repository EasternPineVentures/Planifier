# Planifier Mobile-First Design Plan

Planifier is a trading **education and planning** assistant. It is consumed primarily on a phone, in the moments before, during, and after a trade is considered. Desktop is a secondary surface — useful, but not the design target.

## Product Feel

Planifier should feel like:

- A disciplined trading notebook
- A pocket professor
- A strategy translator
- A plan builder
- A journal for decision accountability

Planifier should **not** feel like:

- A casino trading app
- A signal room
- A broker terminal
- A meme-coin dashboard
- An auto-trading bot

Concretely: no flashing tickers, no scrolling price tape, no green-arrow / red-arrow UI flourishes, no "BUY NOW" buttons, no countdown timers, no notification badges that imply urgency.

## Design Principles

1. **One decision per screen.** A screen should answer one question: "What are you trading?" or "What invalidates this plan?" Not five at once.
2. **Cards over tables.** A phone can show 1–2 cards per fold. Tables collapse into horizontal scrolling, which is a usability failure mode.
3. **Collapsible sections** for plan output. Plan results are long; default-collapse the optional sections and keep the high-signal ones (Pre-trade Checklist, Strategy Notes, Invalidation) open.
4. **Clear warning banners** for missing risk, timeframe mismatch, and invalidation issues — use a single, dedicated warning color and ALWAYS pair color with text and an icon. Color alone is never the signal.
5. **Big tap targets.** Minimum 44×44pt for any interactive element. Spacing ≥ 8pt between adjacent targets.
6. **Dark mode first.** Light mode is not in scope for V1.
7. **No fake bullish/bearish color psychology.** Green ≠ buy. Red ≠ sell. Use neutral ink for scenario text. Reserve red for risk warnings and invalidation only.
8. **Educational framing stays visible but not annoying.** The disclaimer appears once per surface, in muted type, not as a modal or repeated banner.
9. **Static-first layout.** Avoid layout shift from streaming responses, image loads, or skeletons that change height.
10. **Offline-tolerant journaling.** A journal entry should be draftable even if the connection drops mid-save.

## Core Mobile Screens

| # | Screen | Route (current or proposed) | Status |
|---|---|---|---|
| 1 | Home / Command | `/` | exists — needs mobile rework (currently a 2-col grid) |
| 2 | Build Plan Flow | `/plan/new` (proposed) | does not exist — currently embedded in `/` sidebar |
| 3 | Plan Result | rendered inline + `/plans/[id]` | exists — needs collapsible cards |
| 4 | Saved Plans List | `/plans` | exists — needs mobile cards |
| 5 | Plan Detail | `/plans/[id]` | exists — needs mobile layout pass |
| 6 | Journal Entry | embedded in `/plans/[id]` | exists — needs full-screen mobile form |
| 7 | Settings / Provider Status | `/settings` (proposed, later) | not built |

## Out of Scope for This Pass

- No native mobile shell (Expo, Capacitor, React Native)
- No broker / execution / live price integrations
- No PWA install prompt yet (manifest+icons are tracked under "later")
- No chart rendering library — the app intentionally consumes user-provided chart screenshots
- No theming infrastructure beyond Tailwind tokens
