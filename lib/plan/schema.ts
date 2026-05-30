import { z } from "zod";

// Strict shape Planifier returns when a user asks for a plan.
// Keeps the 7-section output structure machine-readable so we can
// render it consistently and store it in Postgres for the journal.
export const PlanSchema = z.object({
  disclaimer: z
    .string()
    .describe(
      "NFA disclaimer. Must be present in every plan. Educational / paper-trading only."
    ),
  riskNotes: z
    .array(z.string())
    .min(1)
    .describe(
      "Volatility, liquidity, news, timeframe-mismatch warnings. Be specific."
    ),
  invalidation: z.object({
    price: z
      .string()
      .nullable()
      .describe(
        "Single price level that kills the plan. Null only if the user did not provide enough chart info to set one."
      ),
    condition: z
      .string()
      .describe(
        "Plain-English condition that invalidates the plan (e.g. 'close below 64,200 on 4H')."
      ),
  }),
  bullishScenario: z
    .string()
    .describe("What must happen for a long bias to be valid."),
  bearishScenario: z
    .string()
    .describe("What must happen for a short bias to be valid."),
  examplePlan: z.object({
    direction: z
      .enum(["long", "short", "either", "stand-aside"])
      .describe("Intended directional bias of this example plan."),
    entryTrigger: z
      .string()
      .describe(
        "Concrete trigger, NOT a 'buy now' instruction. E.g. 'reclaim of 64,500 with rising volume on 1H close'."
      ),
    stopConcept: z
      .string()
      .describe("Where the stop goes and why. Reference the invalidation."),
    profitTargets: z
      .array(z.string())
      .min(1)
      .describe("Tiered targets with rationale, not price predictions."),
    positionSizingNote: z
      .string()
      .describe(
        "Education on sizing from the user's stated risk %. Formula, not a dollar amount."
      ),
  }),
  decisionChecklist: z
    .array(z.string())
    .min(3)
    .describe(
      "Bullet rules: 'Do not enter unless…', 'Avoid trade if…', 'Review after…', 'Check news…'."
    ),
  journalPrompt: z
    .string()
    .describe("One question to answer after the trade closes."),
  timeframeMismatchWarning: z
    .string()
    .nullable()
    .describe(
      "If chart timeframe and holding period don't fit, state it. Otherwise null."
    ),
  cognitiveBiases: z
    .array(z.string())
    .nullable()
    .describe(
      "Optional: biases visible in this setup (recency, false precision, etc.). Null if none."
    ),
});

export type Plan = z.infer<typeof PlanSchema>;
