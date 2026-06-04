# Beginner Trade Workflow v1

Planifier beginner mode should assume the user does not know how to structure a trade yet. The app should teach the workflow step by step, using paper-trading language and plain English.

This is educational planning only. Planifier must not tell the user what to buy, sell, short, or hold. It should help the user observe, prepare, wait, invalidate, and journal.

## The Core Promise

Planifier should answer:

```text
I am new. What am I supposed to look at, in what order, and how do I turn that into a paper-trade plan?
```

The product should not start by asking for expert inputs. It should walk the user from zero to a structured plan.

## Start-To-Finish Flow

### 1. Pick Something To Study

The first screen should be chart-first. It should ask for:

- Market or symbol: `BTC/USD`, `ETH/USD`, `SPY`, `NVDA`, etc.
- Timeframe: `15m`, `1H`, `4H`, `1D`.
- Style: unsure, scalp, day, swing, position.

Plain-English teaching:

```text
The asset is what you are studying. The timeframe is how zoomed-in the chart is. The style is how long the idea might take to play out.
```

The app should then generate a simple practice chart. The user can adjust support, resistance, and invalidation levels and see plain-English feedback before building anything.

### 2. Learn What To Look At On The Chart

Beginner mode should teach the user to scan the chart in this order:

1. Trend: is price making higher highs/lows, lower highs/lows, or moving sideways?
2. Key levels: where did price previously turn, pause, reject, or bounce?
3. Current location: is price near support, resistance, the middle of a range, or a breakout/retest area?
4. Confirmation: what would make the idea more believable?
5. Invalidation: what would make the idea wrong?
6. Risk area: where is the plan fragile?
7. Journal question: what should the user review afterward?

This should become a visible checklist and a live chart read, not hidden text.

### 3. Choose One Practice Angle

Planifier can suggest several candidate angles, but the user should choose one:

- Continuation: trend is intact and price is pulling back.
- Breakout retest: price broke a level and is checking whether it holds.
- Range edge: price is near support or resistance inside a range.
- Failed move: price broke a level, then returned back through it.
- Stand aside: the chart is unclear or in the middle of a range.

Each angle card should show:

- What the idea is.
- What to wait for.
- What would weaken the idea.
- Why this might be low quality.

The default beginner answer should often be `stand aside` when the context is too vague.

### 4. Complete The Plan Fields

After the user chooses an angle, Planifier fills the fields as a draft:

- Asset.
- Timeframe.
- Holding period.
- Fixed risk: locked at 1%.
- Chart context.
- Focus question.

The user then edits or confirms them.

The chart context box should teach this pattern:

```text
Trend:
Key level:
What price is doing now:
What would confirm:
What would invalidate:
What I should avoid:
```

### 5. Build The Structured Plan

The generated plan should always include:

- Pre-trade checklist.
- Still-learning translation.
- Risk notes.
- Invalidation.
- Bullish scenario.
- Bearish scenario.
- Example plan.
- Decision checklist.
- Journal prompt.
- Trusted source links when available.

The plan should read like:

```text
If this happens, then the idea becomes more interesting.
If this other thing happens, the idea is wrong.
If neither happens, wait.
```

It should not read like:

```text
Buy now.
Sell now.
This will work.
```

### 6. Paper The Plan

Planifier should help the user practice without real execution:

- Mark the plan as watching, active, invalidated, completed, or abandoned.
- Let the user record whether the checklist was followed.
- Show the original invalidation so the user cannot quietly rewrite history.
- Encourage screenshots or notes after the fact.

### 7. Journal The Outcome

The journal should ask:

1. Did I follow the plan?
2. Did I wait for confirmation?
3. Did the invalidation happen?
4. Did I move the line after the fact?
5. What did I learn?

The goal is not to be right every time. The goal is to learn whether the user followed a clear process.

## Beginner Layout

### Mobile

Use one primary task per screen:

1. `Chart`: generated candles and adjustable levels.
2. `Start`: choose market, timeframe, style.
3. `Chart Scan`: trend, levels, current location.
4. `Choose Angle`: cards for continuation, retest, range, failed move, stand aside.
5. `Plan Fields`: editable draft fields.
6. `Plan Result`: collapsible plan sections.
7. `Journal`: reflection prompts.

Avoid sidebars on mobile. Use sticky bottom actions: `Next`, `Back`, `Build plan`, `Start journal`.

### Desktop

Use a two-zone worksheet:

- Top: one command strip for market, timeframe, style, and the next action.
- Main: chart workspace as the largest surface.
- Side: walkthrough steps and the minimum plan checklist.
- Below: starting angles, generated plan, chat, and scenario mapping only after the chart path is visible.

The current `/plan/new` page should avoid tall internal scroll panels. The learner should always be able to answer, "What do I do next?"

## What Tools A Beginner Needs

Planifier should teach tool categories, not force one vendor:

- Chart view: candles, timeframe selector, generated practice patterns, screenshot.
- Drawing tools: horizontal support, resistance, and invalidation levels first; simple trendlines later.
- Volume: context only, not proof.
- News/source links: catalyst awareness.
- Journal: screenshot, plan, result, mistake, lesson.

The first built-in version can use generated practice charts. Later versions can replace or enrich those candles with live OHLC data while keeping the same learning controls.

## Product Priorities

### Now

- Make `/` offer a real `Learning Workspace` entry instead of a disabled card.
- Make beginner mode the default path.
- Make the chart workspace the main surface on `/plan/new`.
- Rename confusing expert fields into plain English.
- Keep fixed risk locked.
- Make the chart-scan checklist visible before the plan fields.
- Make `stand aside` a valid, useful outcome.

### Next

- Add a dedicated `/learn` or `/learn/trade-setup` route.
- Split `Chat.tsx` into smaller components:
  - `BeginnerWalkthroughPanel`
  - `StartingAngleExplorer`
  - `ChartScanChecklist`
  - `PlanFieldReview`
  - `PlanResultPanel`
- Persist selected angle and chart scan separately from the generated plan.
- Add plan status: watching, active, invalidated, completed, abandoned.

### Later

- Add a simple chart viewer.
- Add annotation overlays.
- Add guided historical examples.
- Add practice drills.
- Add learning progress by concept.

## Safety Rules

- Do not imply the app knows the user's account, personal risk tolerance, or financial situation.
- Do not use source or FoxClaw context as trade approval.
- Do not turn Redshift or FoxClaw context into beginner-facing execution instructions.
- Always separate observation, confirmation, invalidation, and journaling.
- Prefer `wait` or `stand aside` when context is incomplete.
