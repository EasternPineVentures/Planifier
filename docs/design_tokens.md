# Planifier Design Tokens

Current tokens live in `tailwind.config.mjs`. This file is the source of truth for roles, not just literal hex values. Update both together.

## Color Roles

| Role | Token | Value | When to use |
|---|---|---|---|
| Background app | `bg` | `#f3f7f1` | Page background and quiet input fills |
| Background panel/card | `panel` | `#ffffff` | Cards, sidebars, sheets, major work surfaces |
| Border | `border` | `#cfd8d3` | Dividers, card edges, input outlines |
| Ink primary | `ink` | `#17211d` | Body copy, headings |
| Ink muted | `muted` | `#64726c` | Labels, hints, timestamps, disclaimers |
| Accent discipline | `accent` | `#0f766e` | Primary CTAs, focus rings, progress, valid markers |
| Support practice | `lime` | `#7fb33d` | Support/readiness accents, never a buy signal |
| Context warning | `amber` | `#c77b2a` | Watch areas, resistance, extra context |
| Warning risk/danger | `danger` | `#b33a46` | Risk warnings, invalidation triggered, missing-input errors, timeframe mismatch |

**Hard rules:**
- `accent` is the "you're on track" color. It is not "buy".
- `danger` is the "stop and read this" color. It is not "sell".
- Bullish and bearish scenario text is rendered in `ink` unless the UI is specifically labeling a support/failure marker.
- Color is never the only signal. Always pair it with clear text.

## Spacing Scale

Tailwind defaults are kept; the conventions are:

| Use | Class |
|---|---|
| Inside a card | `space-y-3` |
| Between cards | `gap-3` to `gap-4` |
| Page gutter, mobile | `px-4` |
| Page gutter, desktop | `px-6` |
| Card padding, mobile | `p-3` |
| Card padding, desktop | `p-4` |

Avoid `space-y-1` / `gap-1` in primary content; it makes scannability worse on phones.

## Border Radius

| Use | Class |
|---|---|
| Cards, inputs, buttons | `rounded` |
| Banners | `rounded` |
| Pills / chips | `rounded` |
| Full-screen sheets | `rounded-none` |

Keep radius small. Planifier should feel like a worksheet and chart notebook, not a toy dashboard.

## Typography Roles

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Page heading | system sans | `text-base` to `text-xl` | 600 | Used for visible workflow sections |
| Card title | system sans | `text-sm` | 600 | Often paired with a mono section tag |
| Body | system sans | `text-sm` | 400 | Default reading size |
| Long-form plan output | system sans | `text-sm` | 400 | Comfortable line-height |
| Label / eyebrow | mono | `text-[10px]` to `text-xs` | 400 | `uppercase tracking-wider text-muted` |
| Numeric | mono | `text-base` | 500 | Mono so digits align |
| Disclaimer / footer | system sans | `text-[11px]` | 400 | `text-muted`, single block |

Default font stack: system sans (`ui-sans-serif`, `system-ui`, `-apple-system`, `"Segoe UI"`). Mono stack: `ui-monospace`, `SFMono-Regular`, `Menlo`. No custom web font.

## Warning Style

Warnings such as timeframe mismatch, missing inputs, or invalidation triggered:

```tsx
className="rounded border border-danger/50 bg-danger/10 p-3 text-danger"
```

- Always include the word "Warning:", "Mismatch:", or "Missing:".
- Never auto-dismiss.
- Stack vertically; never overlay other content.

## Card Style

Default card:

```tsx
className="rounded border border-border bg-panel p-3"
```

Primary guidance banner:

```tsx
className="rounded border border-accent/25 bg-accent/5 p-3"
```

Inputs:

```tsx
className="w-full rounded border border-border bg-bg p-2 text-sm"
```

Invalid input:

```tsx
className="... border-danger"
```

## What We Are Not Adding Yet

- No theming provider; Tailwind tokens are sufficient for V1.
- No theme switcher; V1 uses one light worksheet mode.
- No motion library; micro-interactions can come later.
- No icon library yet; add `lucide-react` only when icon count justifies a dependency.
- No second font family.
