# Planifier Beginner Loop Test V1

Planifier has crossed from infrastructure work into product testing. The goal of this test is not to prove the app works. The goal is to find the first moment a normal beginner gets lost.

## Test Mission

Use the app with this mindset:

> I want to make a trade plan, but I do not really know what I am doing.

Start here:

```text
Hard refresh: Ctrl+F5
Open: https://planifier.cloud/plan/new
```

## Test Flow

1. Start from `/plan/new`.
2. Choose the closest beginner path to "I do not know where to start."
3. Pick `XLM/USD`.
4. Pick `1H`.
5. Confirm the fixed 1% risk guardrail is visible.
6. Pick style: `Scalp`.
7. Choose a starting angle.
8. Click "Use this as the starting plan."
9. Build the structured plan.
10. Save it.
11. Add a journal entry.
12. Go to `/plans`.
13. Reopen the saved plan.
14. Check mobile layout.

## Notes Template

```text
PLANIFIER BEGINNER TEST NOTES

Device:
Browser:
Date:

Flow tested:
Pair:
Timeframe:
Style:
Risk:
Fixed at 1% visible? Yes / No

FRICTION LOG

1. Moment:
   What happened:
   Why it felt bad/confusing:
   Severity: Low / Medium / High

2. Moment:
   What happened:
   Why it felt bad/confusing:
   Severity:

3. Moment:
   What happened:
   Why it felt bad/confusing:
   Severity:

PLAN QUALITY NOTES

Was the plan understandable?
Did it explain why the setup matters?
Did it explain what would invalidate the idea?
Did it explain what to wait for?
Did it avoid sounding like financial advice?
Did it feel useful to a beginner?

MOBILE NOTES

Too much scrolling?
Buttons visible?
Right rail usable?
Text readable?
Any layout weirdness?

FINAL VERDICT

Biggest blocker:
Smallest fix that would help:
Do not add yet:
```

## Friction To Watch For

| Area | What Might Break The Feel |
| --- | --- |
| Start flow | User does not know which option to pick |
| Language | Words like confirmation, invalidation, setup, and risk may need helper text |
| Layout | Too much scroll or buried fields |
| AI output | Plan sounds generic instead of teaching |
| Chart context | User does not know what to look at visually |
| Save loop | Saving and reopening does not feel rewarding |
| Journal | User does not know what to write after the plan |
| Mobile | Right rail or fields feel cramped |

## Likely Next Feature

The next product pass should be:

```text
Beginner Guidance Layer V1
```

This should focus on guidance rather than adding major new routes or dashboards.

| Feature | Purpose |
| --- | --- |
| "I am new, guide me" mode | Turns Planifier into a coach, not a blank planner |
| Field helper text | Explains each input in plain language |
| Examples beside fields | Shows what a good answer looks like |
| Confirmation explainer | Explains what needs to happen before an idea becomes stronger |
| Invalidation explainer | Explains what would prove the idea wrong |
| Risk explainer | Explains the fixed 1% guardrail before stepping away |
| Timeframe explainer | Explains what kind of decision the chart helps with |
| Chart context prompts | Gives tap-to-add starters for trend, key level, current behavior, and wrong-if condition |

## Chart Example Library

After the beginner loop feels good, build a small educational chart-pattern library:

1. Trend continuation
2. Failed breakout
3. Range middle patience
4. Support/resistance retest
5. Reclaim
6. Rejection
7. Invalidation example

Each example should teach:

```text
What it looks like
Why traders care
What confirms it
What invalidates it
What beginners often do wrong
```

## Current Context Principle

The news/context layer should stay educational. It should answer:

```text
Why might this pair be moving?
Is there anything obvious I should know before planning?
Does this headline matter to this exact asset/timeframe?
```

It should not become a signal generator.

## Follow-Up Codex Prompt

Use this after beginner test notes are collected:

```text
Review Planifier as a brand-new beginner user. Do not add new major features yet. Focus on the full loop from /plan/new to saved plan to journal entry to reopening from /plans.

Use this test flow:
- Open /plan/new after hard refresh
- Pick XLM/USD
- Pick 1H
- Pick Scalp
- Choose a starting angle
- Click "Use this as the starting plan"
- Build a structured plan
- Save it
- Add a journal entry
- Reopen it from /plans

Find UX friction only:
- confusing wording
- too much scrolling
- unclear next action
- weak or generic generated plan text
- missing helper text
- bad mobile layout
- anything that makes a beginner pause

Do not build a large feature. Make the smallest focused polish pass that improves beginner usability. Prefer helper text, examples, clearer labels, better scroll positioning, and stronger plan seed prompts. Add or update regression tests where practical. Run npm run typecheck, npm test, and npm run build before reporting.
```
