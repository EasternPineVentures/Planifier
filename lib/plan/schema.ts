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
        "Education on sizing from Planifier's fixed 1% risk. Formula, not a dollar amount."
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
  strategyNotes: z.object({
    plainEnglish: z
      .string()
      .describe(
        "Honest restatement of the user's apparent strategy. If vague, say so directly."
      ),
    actionableVersion: z
      .string()
      .describe(
        "Conditional rewrite: 'I am looking for [setup] only if [conditions]. I will not enter if [invalidation].'"
      ),
    learningExample: z
      .string()
      .optional()
      .describe(
        "Optional short educational, conditional example showing what stronger planning looks like."
      ),
    rules: z
      .array(z.string())
      .min(2)
      .max(4)
      .describe(
        "2-4 short, imperative, testable rules. Used as the pre-trade checklist."
      ),
    avoid: z
      .array(z.string())
      .min(1)
      .describe(
        "Behaviors to avoid. Include 'Do not move invalidation after entry' unless user already stated it."
      ),
    missingPieces: z
      .array(z.string())
      .describe(
        "Gaps in the user's plan. Empty array if complete. List 'Exact invalidation level' if absent. Do not list risk unless the fixed 1% app guardrail is missing."
      ),
  }),
  beginnerGuide: z
    .object({
      simpleSummary: z
        .string()
        .describe(
          "Explain the plan in very simple language for a brand-new learner."
        ),
      keyTerms: z
        .array(
          z.object({
            term: z.string(),
            meaning: z.string(),
            inThisPlan: z.string(),
          })
        )
        .min(3)
        .max(8)
        .describe(
          "Plain-language definitions for terms used in this exact plan."
        ),
      stepByStep: z
        .array(z.string())
        .min(3)
        .max(6)
        .describe(
          "Short sequence explaining what the learner should check, in order."
        ),
      riskTranslation: z
        .string()
        .describe(
          "Explain fixed 1% risk in simple words, without dollar advice."
        ),
    })
    .optional()
    .describe(
      "Optional still-learning translation layer for beginner mode plans."
    ),
  trustedSourceLinks: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        description: z.string(),
        category: z.enum([
          "chart",
          "market_data",
          "official",
          "filings",
          "news",
          "education",
        ]),
      })
    )
    .default([])
    .describe(
      "Deterministic source links generated by application code for research verification."
    ),
});

export type Plan = z.infer<typeof PlanSchema>;
