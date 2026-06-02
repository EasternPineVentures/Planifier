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
NEXT_PUBLIC_APP_URL=https://planifier.cloud
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
- Confirm allowed redirect URLs include:
  - `https://planifier.cloud`
  - `https://planifier.cloud/sign-in`
  - `https://planifier.cloud/sign-up`
  - `https://www.planifier.cloud`
  - Vercel preview domains used for testing.
- Confirm sign-in/sign-up works on preview before switching production traffic.

## AI Providers

- Confirm at least one provider key is configured (`ANTHROPIC_API_KEY`, `BLACKBOX_API_KEY`, `OPENAI_API_KEY`, or `HF_TOKEN`).
- Confirm `/api/health` reports an AI provider configured.
- Do not expose provider keys in logs, screenshots, or terminal captures.

## Vercel Checklist

- Connect GitHub repo in Vercel.
- Set environment variables in Vercel project settings.
- Set `NEXT_PUBLIC_APP_URL=https://planifier.cloud` for production.
- Deploy preview.
- Visit `/api/health`.
- Sign in.
- Build a test plan.
- Save and view plan.
- Add journal entry.
- Test `/plan/new` on a mobile viewport.
- Test saved plan cards on a mobile viewport.
- Test PWA manifest detection/add-to-home-screen behavior.

## planifier.cloud Cutover

- In Vercel, add both `planifier.cloud` and `www.planifier.cloud` to the Planifier project.
- Set `planifier.cloud` as the production/canonical domain.
- Configure `www.planifier.cloud` to redirect to `planifier.cloud` to avoid duplicate content.
- Run `vercel domains inspect planifier.cloud` or use the Vercel dashboard to get the exact DNS records.
- If DNS is managed outside Vercel, add those exact records in the registrar/DNS provider dashboard.
- If DNS is managed by Vercel, add or verify the records in Vercel DNS.
- Wait for Vercel to show the domain as configured and SSL as issued.
- Visit `https://planifier.cloud`, `https://planifier.cloud/plan/new`, `https://planifier.cloud/plans`, `https://planifier.cloud/api/health`, `https://planifier.cloud/manifest.webmanifest`, `https://planifier.cloud/robots.txt`, and `https://planifier.cloud/sitemap.xml`.
- Confirm `https://www.planifier.cloud` redirects to `https://planifier.cloud`.
- Confirm the historical scenario chart request works from `/plan/new` after sign-in.

## Manual First Smoke Test

1. Visit `https://planifier.cloud`.
2. Sign in.
3. Build a plan from `/plan/new`.
4. Use fake educational test data only.
5. Confirm Beginner mode can explain terms clearly.
6. Confirm the fixed 1% risk guardrail cannot be changed.
7. Confirm Strategy Notes render.
8. Confirm Pre-Trade Checklist renders.
9. Confirm Trusted Source Links render.
10. Confirm Scenario Chart renders example paths.
11. Confirm historical scenario lookup shows evidence or a clear warning.
12. Save and view the plan.
13. Add a journal entry.
14. Visit `/plans`.
15. Confirm saved plan card displays summary.
16. Visit `/api/health`.
17. Test mobile viewport behavior.

## Explicit Deferrals

- No full offline support yet.
- Production app icons are still needed.
- No native app wrapper yet.
- No community feed yet.
- No public sharing yet.
- No subscription gating yet.
- No broker/execution integrations.
