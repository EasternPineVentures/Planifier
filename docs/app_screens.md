# Planifier App Screens

Per-screen specs for the mobile-first product. Routes marked *(proposed)* don't exist yet.

---

## 1. Home / Command Screen — `/`

**Purpose:** Let the user start a new plan, open saved plans, or open the journal. Set tone (calm, educational).

**Primary actions:**
- **Build New Plan** — primary CTA, full-width on mobile
- **View Saved Plans** — secondary
- **Open Journal** — secondary

**Required components:**
- Top bar with app name + sign-out
- Hero strip (one sentence: "Plans, not signals.")
- Three action cards (vertical stack on phone, 3-col on desktop)
- Footer disclaimer (single line, muted)

**Mobile layout notes:**
- Single column, comfortable padding (16px gutters)
- Sticky bottom CTA only if scrolling is required; otherwise inline
- No sidebar on mobile (current `Chat.tsx` 2-col layout collapses to stacked panels)

**Empty state:** User has zero saved plans → action cards still shown; "View Saved Plans" card shows "0 plans yet — your journal starts on your first build."

**Error state:** Auth/session error → redirect to `/sign-in`. Network down → cards still render statically; "Build New Plan" CTA shows "(offline)" suffix and is disabled.

---

## 2. Build Plan Flow — `/plan/new` *(proposed)*

**Purpose:** Collect the five required inputs without overwhelming the user. Replaces the dense sidebar in current `Chat.tsx`.

**Primary action:** Generate plan at the final step.

**Stepper:**
1. **Asset** — ticker text input, recent-tickers chips (when we have history)
2. **Timeframe + Holding Period** — paired on one screen because they trigger the mismatch check
3. **Risk** — locked guardrail display (`1%`, not editable)
4. **Chart Context** — image upload + textarea; either is sufficient
5. **Review + Generate** — read-only summary, primary "Build plan" CTA, secondary "Edit step N" links

**Required components:**
- Step header (e.g. "Step 2 of 5 — Timeframe")
- Step progress bar (no percentages; just dots)
- "Back" / "Next" footer (sticky)
- Inline validation per step
- Timeframe-mismatch warning inline on step 2 before allowing "Next"

**Mobile layout notes:**
- Each step occupies a full screen
- One primary input visible above the fold
- "Next" button is sticky at bottom and disabled until step is valid
- The textarea on step 4 grows but is height-capped to keep the CTA reachable

**Empty state:** First-time user → step 1 prefilled with a short example placeholder ("e.g. NVDA, BTC/USD, EUR/USD")

**Error state:**
- Missing field → highlight only the offending field, do not block other inputs
- AI failure → land on step 5 with red banner: "The model didn't return a usable plan. Your inputs are saved — try again or adjust step 4."
- DB save failure but plan generated → show the plan anyway, banner: "Plan generated, but we couldn't save it. Copy what matters before refreshing."

---

## 3. Plan Result Screen — inline on `/plan/new` after generate; permalink at `/plans/[id]`

**Purpose:** Present the structured plan in scannable, mobile-friendly cards.

**Sections in order:**
1. Pre-Trade Checklist (banner, always expanded)
2. Honest Read / Summary (Strategy Notes → `plainEnglish`, expanded)
3. Strategy Notes (rules, avoid, missing pieces) (expanded)
4. Scenarios (Bullish / Bearish) (collapsed by default)
5. Risk + Invalidation (expanded — the most important card)
6. Decision Checklist (expanded)
7. Journal Prompt (expanded; CTA: "Start journal entry")
8. Trusted Source Links — *later*

**Required components:**
- `CollapsibleCard` (new) — header with chevron, body, persisted-open state per section in localStorage
- Pre-Trade Checklist banner (already exists, derived from `strategyNotes.rules`)
- Section tags (e.g. "1 of 7") so the user can see depth without scrolling
- Sticky bottom bar with: "Save & journal" + "New plan"

**Mobile layout notes:**
- One card per fold; vertical scroll only, never horizontal
- Collapsed cards still show 1-line preview text (first sentence of body)
- Disclaimer at the very bottom, muted, single block — not repeated per card

**Empty state:** N/A — this screen only renders when a plan exists.

**Error state:** Plan loaded but `strategyNotes` missing (legacy plan) → render "Strategy Notes unavailable for this older plan." (already implemented). All other sections still render.

---

## 4. Saved Plans List — `/plans`

**Purpose:** Browse and reopen past plans.

**Primary action:** Tap a card to open the plan.

**Card content:**
- Asset ticker (large, mono)
- Timeframe • Holding period (single muted line)
- Created date (relative — "3d ago")
- Status — *later*: `active` / `invalidated` / `completed` / `abandoned` (badge)
- Short strategy summary (1 line — first sentence of `strategyNotes.plainEnglish` when present)

**Required components:**
- `PlanCard` (new) — replaces any table layout
- Filter bar — *later*: by status, ticker, date range
- "New plan" floating action button (bottom-right, thumb-reachable)

**Mobile layout notes:**
- Single column of cards, 12px gap
- Each card ≥ 88px tall (comfortable tap target)
- Newest first
- Lazy-load past ~50 plans — *later*

**Empty state:** "No plans yet." Card-styled, with "Build your first plan →" CTA.

**Error state:** Fetch failure → "Couldn't load your plans. Pull to refresh or try again." with retry button. Do not silently render an empty list.

---

## 5. Plan Detail Screen — `/plans/[id]`

**Purpose:** Re-read a saved plan and journal against it.

**Primary actions:**
- Add Journal Entry
- Review Strategy Notes
- Mark status — *later* (active / invalidated / completed / abandoned)
- Open Trusted Source Links — *later*

**Required components:**
- Header strip: ticker, timeframe, holding period, created-at
- Re-use `PlanView` (currently full-fidelity render)
- Journal section at the bottom: prior entries list + "Add entry" CTA
- Back-arrow that returns to `/plans`

**Mobile layout notes:**
- Header is sticky and condenses on scroll
- Journal entries collapse oldest-first by default
- "Add entry" opens the Journal Entry screen full-screen on mobile, modal on desktop

**Empty state:** No prior journal entries → "No entries yet. The plan only matters if you write down what actually happened."

**Error state:** Plan ID unknown / not owned by user → 404 page with "Back to your plans" CTA. Never expose another user's plan even by accident.

---

## 6. Journal Entry Screen — full-screen route or modal

**Purpose:** Force honest reflection against the plan's own rules.

**Primary action:** Save entry.

**Prompts (rendered as labeled textareas):**
1. Did I follow the plan?
2. Did I follow my Strategy Notes rules?
3. What changed?
4. Did I move invalidation?
5. What did I learn?

**Required components:**
- Five prompt blocks (label + textarea + character counter)
- Read-only mini-recap of the plan's `rules` at the top (so the user is comparing against their own checklist)
- Sticky "Save entry" CTA
- "Discard" link (with confirm)

**Mobile layout notes:**
- Full-screen, no nav chrome
- Auto-save draft to localStorage every 5s so a stray back-swipe doesn't destroy work
- Keyboard-aware: CTA always visible above the IME

**Empty state:** N/A — opened from a plan.

**Error state:** Save failure → keep the form populated, show inline "Save failed. Tap to retry." Do not navigate away on error.

---

## 7. Settings / Provider Status — `/settings` *(proposed, later)*

**Purpose:** Show which AI providers are configured (from `/api/health`), which model is in use, and let the user nudge routing.

**Primary actions (later):**
- Toggle `PROVIDERS_PREFERRED`
- See last 7d cost (when usage tracking exists)
- Sign out

**Out of scope for V1.**

---

## 8. Beginner Learning Workspace - `/learn` *(proposed)*

**Purpose:** Teach a beginner how to find and structure a paper-trade setup from start to finish before asking them to generate a plan.

Reference workflow: [docs/training/beginner_trade_workflow_v1.md](training/beginner_trade_workflow_v1.md).

**Primary action:** Start guided walkthrough.

**Flow:**
1. Pick market, timeframe, and style.
2. Use the chart workspace: generated candles, adjustable support, resistance, and invalidation levels, live feedback.
3. Scan the chart: trend, key levels, current location, confirmation, invalidation.
4. Choose one practice angle: continuation, breakout retest, range edge, failed move, or stand aside.
5. Review draft plan fields.
6. Build structured plan.
7. Journal outcome.

**Required components:**
- `ChartWorkspace` - generated candle chart, adjustable levels, and live plain-English feedback.
- `ChartScanChecklist` - visible checklist for what to look at on a chart.
- `StartingAngleExplorer` - cards for possible educational angles.
- `BeginnerWalkthroughPanel` - current step, why it matters, and next action.
- `PlanFieldReview` - editable draft fields with plain-English help.
- `PlanResultPanel` - structured plan result with still-learning translation first.

**Mobile layout notes:**
- One task per screen.
- Sticky bottom `Back` / `Next` actions.
- No sidebar.
- `Stand aside` is a valid end state when the chart is unclear.

**Desktop layout notes:**
- Top: command strip with market, timeframe, style, and next action.
- Main: chart workspace as the largest visible surface.
- Right rail: walkthrough progress and the minimum plan checklist.
- Lower page: starting angles, chat, scenario map, and generated plan.

**Empty state:** First-time user sees a short explanation: "You do not need a setup yet. Start by choosing one market to study."

**Error state:** Context fetch fails -> keep the walkthrough usable with manual chart notes and screenshot upload.
