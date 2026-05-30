# Planifier Deploy Checklist

Practical pre-deploy and first-smoke checklist for Stage 6 readiness.

## Required Environment Variables

Use only variables listed in `.env.example`:

```text
ANTHROPIC_API_KEY=
ANTHROPIC_API_KEY_V2=
BLACKBOX_API_KEY=
BLACKBOX_CHAT_MODEL=
BLACKBOX_PLAN_MODEL=
OPENAI_API_KEY=
HF_TOKEN=
HUGGINGFACE_API_KEY=
HUGGINGFACE_CHAT_MODEL=
HUGGINGFACE_PLAN_MODEL=
PLANIFIER_MODEL=auto
PROVIDERS_PREFERRED=anthropic,blackbox,openai
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

## Secret Safety

Do not commit `.env.local`.

If any secret was pasted into chat, logs, screenshots, or tool output, rotate it before deploying.

Before pushing, run:

```powershell
git ls-files | findstr /I env
```

The only tracked env file should be `.env.example`.

## Pre-Deploy Commands

Run all of these before opening a deploy PR:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
git diff --check
git status
git ls-files | findstr /I env
```

## Database

- Confirm Neon `DATABASE_URL` is set for the target environment.
- Run `npm run db:push` (or the project migration command if workflow changes).
- Verify `users`, `plans`, and `journal_entries` tables exist.
- Verify local test user flow works before production testing.

## Clerk

- Confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set.
- Confirm `CLERK_SECRET_KEY` is set.
- Confirm allowed redirect URLs include Vercel preview and production domains.
- Confirm sign-in/sign-up works in preview.

## AI Providers

- Confirm at least one provider key is configured (`ANTHROPIC_API_KEY`, `BLACKBOX_API_KEY`, `OPENAI_API_KEY`, or `HF_TOKEN`).
- Confirm `/api/health` reports an AI provider configured.
- Do not expose provider keys in logs, screenshots, or terminal captures.

## Vercel Checklist

- Connect GitHub repo in Vercel.
- Set environment variables in Vercel project settings.
- Deploy preview.
- Visit `/api/health`.
- Sign in.
- Build a test plan.
- Save and view plan.
- Add journal entry.
- Test `/plan/new` on a mobile viewport.
- Test saved plan cards on a mobile viewport.
- Test PWA manifest detection/add-to-home-screen behavior.

## Manual First Smoke Test

1. Visit home page.
2. Sign in.
3. Build a plan from `/plan/new`.
4. Use fake educational test data only.
5. Confirm Strategy Notes render.
6. Confirm Pre-Trade Checklist renders.
7. Confirm Trusted Source Links render.
8. Save and view the plan.
9. Add a journal entry.
10. Visit `/plans`.
11. Confirm saved plan card displays summary.
12. Visit `/api/health`.
13. Test mobile viewport behavior.

## Explicit Deferrals

- No full offline support yet.
- Production app icons are still needed.
- No native app wrapper yet.
- No community feed yet.
- No public sharing yet.
- No subscription gating yet.
- No broker/execution integrations.
