# FoxClaw to Planifier Context Bridge

Planifier may use FoxClaw as a context source, but never as trade authority.

## Boundary

FoxClaw context can inform:

- source trust notes
- market feed recency
- paper-only outcome summaries
- open paper-position awareness
- warnings that context is stale or incomplete

FoxClaw context must not become:

- live order approval
- position sizing authority
- leverage approval
- account/fund movement authority
- proof that an idea is safe

## Current Local Truth

The local FoxClaw command center currently exposes:

- `runtime_logs/command_center.json`
- `runtime_logs/reality_audit.json`
- `storage/redshift_relay_events.jsonl`

Planifier reads only a sanitized subset from `command_center.json` through
`lib/context/foxclaw.ts`.

## Product Labeling

Any Planifier UI that uses this context must label it as:

```text
FoxClaw context-only
```

If relay data is stale, Planifier should say so plainly. Stale context can still
be useful as historical/paper context, but not as live market truth.

## Deployment Note

The Vercel deployment cannot read the user's local Desktop FoxClaw files. For
production, this bridge needs one of these:

- a scheduled exporter from FoxClaw into Planifier's database
- a read-only signed context endpoint
- a manual import file that strips secrets and authority fields

Until then, production Planifier gracefully falls back to public market data and
user-provided context.
