# Planifier Design Tokens

Current tokens live in `tailwind.config.mjs`. This file is the source of truth for **roles** (what the colors mean), not just the literal hex values. Update both together.

## Color Roles

| Role | Token (Tailwind) | Value | When to use |
|---|---|---|---|
| Background — app | `bg` | `#0a0a0b` | Page background only |
| Background — panel/card | `panel` | `#121214` | Cards, sidebars, sheets |
| Border | `border` | `#1f1f23` | Dividers, card edges, input outlines |
| Ink — primary | `ink` | `#e7e7ea` | Body copy, headings |
| Ink — muted | `muted` | `#8a8a93` | Labels, hints, timestamps, disclaimers |
| Accent — discipline | `accent` | `#d4ff3a` | Primary CTAs, focus rings, Pre-Trade Checklist banner, "valid" markers |
| Warning — risk/danger | `danger` | `#ff5a5a` | Risk warnings, invalidation triggered, missing-input errors, timeframe mismatch |

**Hard rules:**
- `accent` is the "you're on track" color. It is NOT "buy".
- `danger` is the "stop and read this" color. It is NOT "sell".
- Bullish and bearish *scenario text* is rendered in `ink` (neutral), not green or red.
- Color is never the only signal — always pair with text + icon.

## Spacing Scale

Tailwind defaults are kept; the conventions are:

| Use | Class |
|---|---|
| Inside a card (vertical rhythm) | `space-y-3` (12px) |
| Between cards | `gap-3` to `gap-4` (12–16px) |
| Page gutter, mobile | `px-4` (16px) |
| Page gutter, desktop | `px-6` (24px) |
| Card padding, mobile | `p-3` (12px) |
| Card padding, desktop | `p-4` (16px) |

Avoid `space-y-1` / `gap-1` in primary content; it makes scannability worse on phones.

## Border Radius

| Use | Class |
|---|---|
| Cards, inputs, buttons | `rounded` (4px) |
| Banners (Pre-Trade Checklist, warning) | `rounded` (4px) |
| Pills / chips (timeframe, holding period) | `rounded` |
| Full-screen sheets | `rounded-none` (no radius on mobile sheets) |

Keep radius small. Heavy rounding reads as consumer/casual; Planifier wants notebook, not toy.

## Typography Roles

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Page heading | system sans | `text-base`–`text-lg` | 600 | Sparingly used |
| Card title | system sans | `text-sm` | 600 | Often paired with a mono section tag |
| Body | system sans | `text-sm` | 400 | Default reading size; mobile-friendly |
| Long-form (plan output) | system sans | `text-sm` | 400 | Comfortable line-height (1.55) |
| Label / eyebrow | mono | `text-[10px]`–`text-xs` | 400 | `uppercase tracking-wider text-muted` |
| Numeric (price, ticker) | mono | `text-base` | 500 | Mono so digits align |
| Disclaimer / footer | system sans | `text-[11px]` | 400 | `text-muted`, single block |

Default font stack: system sans (`ui-sans-serif`, `system-ui`, `-apple-system`, `"Segoe UI"`). Mono stack: `ui-monospace`, `SFMono-Regular`, `Menlo`. No custom web font.

## Warning Style

Warnings (timeframe mismatch, missing inputs, invalidation triggered):

```
className="rounded border border-danger/50 bg-danger/10 p-3 text-danger"
```

- Always include an icon or the word "Warning:" / "Mismatch:" / "Missing:" prefix
- Never auto-dismiss
- Stack vertically; never overlay other content

## Card Style

Default card:

```
className="rounded border border-border bg-panel p-3"
```

Pre-Trade Checklist banner (special accent variant):

```
className="rounded border border-accent/60 bg-accent/10 p-3"
```

Inputs:

```
className="w-full rounded border border-border bg-bg p-2 text-sm"
```

Invalid input:

```
className="… border-danger"
```

## What we are NOT adding (yet)

- No theming provider (Tailwind tokens are sufficient for V1)
- No light mode
- No motion library (Framer Motion etc.) — micro-interactions later
- No icon library yet (use inline SVG or Unicode glyphs); add `lucide-react` only when icon count justifies a dependency
- No second font family
