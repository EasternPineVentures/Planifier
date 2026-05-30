# Planifier

A trading **planning** assistant. Not a signal bot. Not a financial advisor. Not a crystal ball.

Planifier turns charts into structured plans: risk notes, invalidation level, bullish/bearish scenarios, an example plan, a decision checklist, and a journal prompt.

> **NOT FINANCIAL ADVICE.** Educational and paper-trading planning only. Real-money trading adds psychology, slippage, fees, liquidity, and emotional pressure that paper trading does not replicate. Always do your own research.

## Product Boundary

Planifier is a trading education and planning assistant.

It helps users:
- Understand chart context
- Build structured trade plans
- Define risk and invalidation
- Review possible scenarios
- Journal decisions and outcomes

Planifier does not:
- Execute trades
- Place orders
- Move funds
- Connect to broker execution APIs
- Guarantee market outcomes
- Provide personalized financial advice

Planifier is for educational, planning, and paper-trading workflows.

## Stack

- **Next.js 15** (App Router, React 19) — `app/`
- **AI SDK** (`ai`, `@ai-sdk/openai`) — streaming chat (`/api/chat`) and structured plan generation (`/api/plan`, via `generateObject` + zod schema)
- **Clerk** — auth; `middleware.ts` protects every route except `/sign-in`, `/sign-up`, and `/api/health`
- **Neon Postgres** + **Drizzle ORM** — persistence for users, plans, and journal entries
- **Tailwind CSS** — minimal dark UI
- **TypeScript** strict
- Deploy target: **Vercel** (Neon via Vercel Marketplace recommended)

## Project structure

```
app/
  api/
    chat/route.ts          # AI SDK streaming endpoint (free-form Q&A, auth-required)
    plan/route.ts          # generateObject → structured 7-section plan, persisted
    plans/route.ts         # list current user's plans
    plans/[id]/route.ts    # get plan + journal; POST adds a journal entry
  plans/
    page.tsx               # "My plans" list
    [id]/page.tsx          # plan detail + journal view + entry form
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx
  layout.tsx               # ClerkProvider
  page.tsx                 # mounts <Chat />
components/
  Chat.tsx                 # five-input gating panel + streaming chat + "Build structured plan"
  PlanView.tsx             # renders the 7-section structured plan
  JournalForm.tsx          # post-trade journal entry form
  Nav.tsx                  # top nav with Clerk <UserButton />
lib/
  prompts.ts               # reads prompts/runtime-system-prompt.md
  validation.ts            # five-input gating + timeframe/holding-period sanity check
  plan/schema.ts           # zod PlanSchema (single source of truth for plan shape)
  db/
    client.ts              # Drizzle + @neondatabase/serverless
    schema.ts              # users, plans, journal_entries tables
    users.ts               # requireUserId() — Clerk id → row in users (upsert)
middleware.ts              # Clerk auth gate
drizzle.config.ts          # drizzle-kit config
prompts/
  runtime-system-prompt.md     # what Planifier says to end users (single source of truth)
  builder-context-prompt.md    # what you paste into Codex/Claude when designing the product
```

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
# edit .env.local with OPENAI_API_KEY, DATABASE_URL, Clerk keys
npm run db:push   # creates tables in your Neon database
npm run dev
```

Open http://localhost:3000. You'll be redirected to `/sign-in`.

## Environment variables

- At least one AI provider key is required: `ANTHROPIC_API_KEY`, `BLACKBOX_API_KEY`, `OPENAI_API_KEY`, or `HF_TOKEN`
- `PLANIFIER_MODEL` — optional, default `gpt-4o` (needs multimodal for image input)
- `DATABASE_URL` — Neon Postgres connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from Clerk dashboard
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `HF_TOKEN` — optional Hugging Face token (canonical)
- `HUGGINGFACE_API_KEY` — optional alias fallback for `HF_TOKEN`
- `HUGGINGFACE_CHAT_MODEL` / `HUGGINGFACE_PLAN_MODEL` — optional Hugging Face model overrides

## Hugging Face Provider

Planifier can optionally use Hugging Face Inference Providers as an experimental model lane.

Set:

```text
HF_TOKEN=
HUGGINGFACE_CHAT_MODEL=
```

Hugging Face is not the default plan-generation provider yet. Structured plan generation should remain on the most reliable configured provider until specific Hugging Face models are tested for schema reliability and vision support.

## Deploy to Vercel

1. Push to GitHub, import into Vercel.
2. **Storage** tab → add **Neon Postgres** from the Marketplace. `DATABASE_URL` is auto-injected.
3. Add `OPENAI_API_KEY` and your Clerk keys in **Settings → Environment Variables**.
4. From your local machine, run `npm run db:push` against the same `DATABASE_URL` to create tables (or wire it into a build step).
5. Deploy.

## Two output modes

- **Chat (`/api/chat`)** — streaming, free-form Q&A still bound by the runtime system prompt. Use for follow-up questions like "what does invalidation mean here?".
- **Structured Plan (`/api/plan`)** — `generateObject` with the zod `PlanSchema`. Always returns the seven sections plus a disclaimer, timeframe-mismatch warning, and optional cognitive-bias notes. Persisted to Postgres so it shows up under **My plans** and can be journaled.

## Input gating (the five required inputs)

`lib/validation.ts` enforces — both client-side (panel UI) and server-side (every route short-circuits when inputs are missing):

1. Asset ticker
2. Chart timeframe
3. Holding period (Scalp / Day / Swing / Position)
4. Risk per trade %
5. Chart screenshot **or** a written description >20 chars

Plus a timeframe-vs-holding-period sanity check.

## Swap the LLM provider

```ts
// app/api/chat/route.ts and app/api/plan/route.ts
import { anthropic } from "@ai-sdk/anthropic";
const model = anthropic("claude-3-5-sonnet-latest");
```

Install the matching `@ai-sdk/<provider>` package. Image inputs require a multimodal model.

## Design rules (do not break)

- **Never** add "buy now / sell now / will go up" language to the system prompt.
- **Never** strip the disclaimer (it's a required field on `PlanSchema`).
- **Never** auto-execute trades. There is no broker integration. There never will be in this repo.
- If you add tools (web search, news, indicators), they must feed the **planning** output, not produce signals.

## Builder vs runtime mode

When working on Planifier with an LLM coding assistant, paste `prompts/builder-context-prompt.md` first so it treats your messages as product-design input, not personal trade requests. Use `LIVE ANALYSIS MODE: …` to test the runtime persona.

## Health Check

After deployment, visit:

```text
/api/health
```

A healthy deployment should return:

```json
{
  "ok": true,
  "app": "planifier",
  "database": "connected",
  "auth": "configured",
  "openai": "configured",
  "ai": {
    "anthropic": "configured",
    "blackbox": "missing",
    "openai": "configured",
    "huggingface": "missing",
    "mode": "auto",
    "anyConfigured": true
  }
}
```

This endpoint confirms the app is running, database connectivity, auth configuration, and AI provider configuration. It does not expose secret values.

## Trusted Source Links

Planifier includes research links with generated plans so users can verify chart context and asset information outside the AI response.

Depending on asset type, Planifier may link to:
- TradingView for charts and market pages
- CoinGecko for crypto market data
- CoinMarketCap for crypto market data
- Nasdaq for stock quote and company market pages
- SEC EDGAR for official U.S. company filings

These links are for research and verification. Planifier does not guarantee that third-party pages are complete, current, or appropriate for every asset.

## Teach by Example

Planifier uses short educational examples to help users turn vague ideas into clear, repeatable trading logic.

The goal is not to shame users for missing details. The goal is to show what stronger planning looks like.

Planifier may be direct when a plan is incomplete, but it should remain respectful. Anyone using the app is already trying to learn, and that effort matters.

## Mobile / PWA

Planifier is designed mobile-first as a responsive web app.

The app includes a basic web app manifest so it can begin supporting install-like mobile workflows. Full offline support is not included yet.

Production app icons should be added before serious install testing.
