# Community Plans v0 (Future Backlog)

This document captures a potential future Community Plans direction for Planifier.

Scope of this file:
- Backlog planning only.
- No implementation in the current pass.
- No changes to the personal mobile MVP boundary.

## Future Feature Concept

Community Plans may eventually allow users to:
- Mark plans as private or public.
- Share redacted versions of plans.
- Browse educational community examples.
- View public plans from other users.
- Learn how other users structure strategies.
- Compare planning styles.
- Discover examples of strong Strategy Notes.

## Possible Future Components

Potential future pieces:
- visibility field on plans: private/public
- public read-only plan pages
- owner-only journal privacy
- visibility toggle
- community feed
- redacted plan sharing
- subscription-gated community access later
- moderation tools later
- user reporting tools later
- privacy preview before sharing

## Possible Future API Routes

Potential routes for later design and implementation:
- PATCH /api/plans/[id]/visibility
- GET /api/plans/public
- GET /api/plans/[id]/shared
- POST /api/plans/[id]/share
- DELETE /api/plans/[id]/share

## Possible Future UI

Potential UI pieces:
- PlanCard
- VisibilityToggle
- CommunityPage
- SharedPlanPage
- RedactionPreview
- ShareSettingsPanel

## Privacy and Safety Cautions

Important cautions:
- Public trading plans may reveal sensitive strategy information.
- User chart screenshots may contain balances, broker names, positions, or personal data.
- Journals must remain private by default.
- Public plans should be redacted before sharing.
- Sharing should not make Planifier feel like a signal room.
- Community examples should be framed as education, not trade recommendations.
- Users should be warned before making anything public.

## Access Control Cautions

Important access-control constraints:
- Verify Clerk user ID vs internal database user ID before ownership checks.
- Do not compare incompatible IDs.
- Owner-only fields must stay private.
- Public viewers should not see journal entries.
- Subscription gating should not be added until the billing system is real and tested.

## Monetization Cautions

Future monetization guidance:
- Subscription gating is future work.
- Do not add subscriptionStatus until pricing/billing provider is chosen.
- Avoid manual subscription flags as a long-term system.
- Decide later between Stripe, Clerk Billing, Polar, or another provider.

## Recommended Future Order

1. Private share links
2. Redaction preview
3. Public read-only shared plan pages
4. Owner-only visibility controls
5. Community examples library
6. Subscription-gated community feed
7. Moderation/reporting tools

Status: Backlog only. Do not implement before the personal mobile MVP is deployed and tested.
