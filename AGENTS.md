# Planifier Agent Working Agreement

This repo is Planifier. Before touching files, verify and say which project is active.

## Required Start-Of-Work Anchor

For every Planifier coding or repo-cleaning pass, start with a read-only anchor:

```text
Project: Planifier
Path: C:\Users\brend\OneDrive\Desktop\Planifier
Branch:
Remote:
Worktree:
Scope:
Other repos touched: none unless explicitly requested
```

Use current command output for branch, remote, and worktree state. Do not rely on memory for those fields.

## Repo Boundary

- Planifier source lives in `C:\Users\brend\OneDrive\Desktop\Planifier`.
- Do not edit FoxClaw, Redshift, CoinFox, Perpetuator, or any sibling repo from a Planifier task unless the user explicitly switches scope.
- If a task mentions multiple projects, do a read-only audit first and name every repo that would be touched before editing.
- Keep commits one repo at a time.

## Product Boundary

Planifier is an educational paper-trading planning app.

Planifier may:

- help users describe chart context
- generate structured educational plans
- save plans and journal entries
- use public market/news context
- use sanitized FoxClaw context as advisory context only

Planifier must not:

- execute trades
- approve live trades
- set leverage
- move funds
- treat FoxClaw or Redshift context as execution authority
- print or commit secret values

## FoxClaw / Redshift Boundary

FoxClaw context inside Planifier is `context_only`.

The local bridge currently reads a sanitized subset from:

```text
..\FoxClaw\runtime_logs\command_center.json
```

Production Vercel cannot read that local file. Production must gracefully fall back to public market/news context unless a separate read-only exporter or signed endpoint is built.

Redshift leverage/capital stance stays separate from Planifier and FoxClaw context. Never blend Redshift stance into Planifier approval language.

## Secrets

- Never print `.env.local` values.
- It is okay to report whether env files or env vars are present.
- `.env.example` should contain placeholders only.

## Verification

For app-code changes, run:

```text
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

For docs-only changes, at least run `git status --short --branch` and inspect the diff before committing.
