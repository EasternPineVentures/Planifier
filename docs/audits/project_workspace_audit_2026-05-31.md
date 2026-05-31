# Project Workspace Audit - 2026-05-31

This is a read-only workspace boundary audit taken before more Planifier cleanup. The goal is to prevent accidental overlap between Planifier, FoxClaw, Redshift, CoinFox, and other Eastern Pine repos.

## Active Repo

| Field | Value |
| --- | --- |
| Project | Planifier |
| Path | `C:\Users\brend\OneDrive\Desktop\Planifier` |
| Branch | `main` |
| Remote | `https://github.com/EasternPineVentures/Planifier` |
| Worktree | clean at audit start |
| Latest local commits | `f0939b4`, `fc004c4`, `b7164c5`, `2498305`, `56590ad` |

## Nearby Repo Map

| Project folder | Path | Branch | State | Origin |
| --- | --- | --- | --- | --- |
| FoxClaw | `C:\Users\brend\OneDrive\Desktop\FoxClaw` | `codex/redshift-relay-pipe-watchdog-v0` | dirty | `https://github.com/EasternPineVentures/FoxClaw.git` |
| Planifier | `C:\Users\brend\OneDrive\Desktop\Planifier` | `main` | clean | `https://github.com/EasternPineVentures/Planifier` |
| coinfox | `C:\Users\brend\EPV_Dev\coinfox` | `main` | clean | `https://github.com/EasternPineVentures/coinfox.git` |
| foxclaw | `C:\Users\brend\EPV_Dev\foxclaw` | `master` | dirty | `https://github.com/EasternPineVentures/FoxClaw` |
| redshift_core | `C:\Users\brend\EPV_Dev\redshift_core` | `redshift/capital-box-v0` | dirty | `https://github.com/EasternPineVentures/Project_Redshift.git` |
| FoxClaw-Ventures | `C:\Users\brend\OneDrive\Documents\GitHub\FoxClaw-Ventures` | `review/bugfix-sweep-v0` | dirty | `https://github.com/EasternPineVentures/FoxClaw.git` |
| Perpetuator | `C:\Users\brend\OneDrive\Documents\GitHub\Perpetuator` | `master` | clean | `https://github.com/EasternPineVentures/Perpetuator.git` |

## Main Overlap Risks

1. There are three local FoxClaw-family checkouts pointing at the FoxClaw remote family:
   - Desktop `FoxClaw`
   - EPV Dev `foxclaw`
   - Documents `FoxClaw-Ventures`

   Do not assume they are interchangeable. Name the exact path before any FoxClaw work.

2. Planifier has a local FoxClaw context bridge:
   - `lib/context/foxclaw.ts`
   - default path: `..\FoxClaw\runtime_logs\command_center.json`

   This is read-only advisory context. It is not trade authority and does not work on Vercel without a future exporter or endpoint.

3. Redshift is separate:
   - repo: `C:\Users\brend\EPV_Dev\redshift_core`
   - remote: `Project_Redshift`
   - stance/leverage/capital decisions must not leak into Planifier approval language.

4. Planifier currently tracks a Clerk skill bundle:
   - path: `.agents/skills`
   - tracked files: 145
   - approximate size: 492 KB

   This may be useful for local Codex/Clerk work, but it is agent tooling rather than product runtime. Decide later whether to keep it tracked, move it to dev docs, or remove it from the product repo.

5. Planifier has an unused older component:
   - `components/BuildPlanStepper.tsx`

   The live `/plan/new` route now imports `components/Chat.tsx`. `BuildPlanStepper.tsx` is a cleanup candidate after confirming no rollback need.

   > **RESOLVED 2026-05-31:** confirmed no in-repo references and removed `components/BuildPlanStepper.tsx` (recoverable via git history). Typecheck + tests green after removal.

6. Some docs are stale relative to the current chat-first builder:
   - `README.md`
   - `docs/app_structure_audit.md`
   - older mobile planning docs

   These should be refreshed after the beginner test flow stabilizes.

## Planifier Current Source Map

| Area | Files |
| --- | --- |
| User pages | `app/page.tsx`, `app/plan/new/page.tsx`, `app/plans/page.tsx`, `app/plans/[id]/page.tsx` |
| API routes | `app/api/chat`, `app/api/health`, `app/api/plan`, `app/api/plan/intake`, `app/api/plan/explore`, `app/api/plans` |
| Main builder UI | `components/Chat.tsx` |
| Saved plan UI | `components/PlanView.tsx`, `components/JournalForm.tsx`, `components/TrustedSourceLinks.tsx` |
| AI routing | `lib/ai/router.ts` |
| Market/news context | `lib/market/kraken.ts`, `lib/news/rss.ts` |
| FoxClaw context bridge | `lib/context/foxclaw.ts` |
| Persistence | `lib/db/client.ts`, `lib/db/schema.ts`, `lib/db/users.ts` |
| Plan schema and validation | `lib/plan/schema.ts`, `lib/validation.ts`, `lib/plan/timeframe.ts` |
| Tests | `tests/*.test.ts` |
| Product docs | `docs/`, `prompts/` |

## Cleanup Order

### P0 - Operating Rule

Adopt the start-of-work anchor in `AGENTS.md`:

```text
Project, path, branch, remote, worktree, scope, other repos touched.
```

This should happen before every coding or cleanup pass.

### P1 - Planifier Repo Hygiene

- Refresh README to match the current chat-first `/plan/new` flow.
- ~~Decide whether to delete or archive `components/BuildPlanStepper.tsx`.~~ Done — removed.
- Decide whether `.agents/skills` belongs in the product repo long-term.
- Keep `.env.local`, `.vercel`, `.next`, `node_modules`, and build artifacts ignored.

### P2 - Cross-Project Hygiene

- Pick one canonical FoxClaw checkout for each kind of work before editing.
- Do not mix Desktop FoxClaw runtime work with EPV Dev FoxClaw source work in the same commit.
- Do not touch Redshift from Planifier unless the task explicitly switches to Redshift.
- If Planifier needs FoxClaw data in production, build an explicit read-only export path instead of reading local runtime files.

### P3 - Product Cleanup After Beginner Test

- Use the beginner-loop notes before changing UX again.
- Prefer small polish passes over broad feature additions.
- Keep Planifier educational and planning-only.

## Recommended Project Header For Future Replies

Use this format when work begins:

```text
Working project: Planifier
Path: C:\Users\brend\OneDrive\Desktop\Planifier
Branch/remote: main -> EasternPineVentures/Planifier
Worktree: clean/dirty
Scope: docs/code/deploy/etc.
Other repos touched: none
```

If any of those fields are unknown, verify them before editing.
