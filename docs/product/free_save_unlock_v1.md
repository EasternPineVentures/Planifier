# Planifier Free-First Save Unlock

## Position

Planifier is the practical notebook beside the Eastern Pine Ventures Trading School.
The school teaches concepts and habits. Planifier helps the user turn those concepts into structured paper plans, reviews, and journals.

Planifier is not a signal bot, broker, trade executor, or financial advisor.

## Pricing Stance

Most of Planifier should stay free.

Free users should be able to:
- Read public learning material.
- Open the learning chart.
- Build paper plans.
- Use setup checklists.
- Practice thesis, invalidation, timeframe, risk, and review habits.

The paid unlock should be simple:
- One-time payment.
- Suggested price: $5.
- Unlocks persistent saving features.
- No monthly subscription required for the core product.

The wording should avoid fake scarcity, course-funnel pressure, or performance promises.

## Save Unlock Scope

The one-time unlock can include:
- Saved plan notebook.
- Journal history.
- Export or download.
- Saved chart levels.
- Personal notes across lessons and setups.

The unlock should not include:
- Trade signals.
- Authority to trade.
- Live execution.
- Broker or exchange control.
- Guaranteed outcomes.

## Entitlement Shape

Future implementation can use:
- Clerk for identity.
- Stripe Checkout or Payment Links for a one-time payment.
- A local database entitlement such as `save_unlocked_at`.
- Server-side checks before persistent writes.

Suggested states:
- `free`: can learn, build, and practice.
- `save_unlocked`: can persist notebooks, journals, and exports.
- `admin`: internal testing and support only.

If payment is not wired yet, saving can be hidden, limited, invite-gated, or treated as internal beta.

## FoxClaw And Trading School Boundary

FoxClaw and the Trading School can supply educational context, vocabulary, quality standards, and paper-review habits.

They must not give Planifier live trade authority. Planifier should keep every setup in the planning and review lane unless a separate, explicitly governed system changes that boundary.

## Product Promise

Planifier should help users become more disciplined traders by making the boring parts easier to repeat:
- Define the setup.
- Name the invalidation.
- Match the timeframe.
- Calculate risk.
- Write scenarios.
- Journal the outcome.
- Review what actually happened.

The product should feel like a serious worksheet, not a casino, hype feed, or paid course funnel.
