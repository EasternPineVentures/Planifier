import type { Plan } from "@/lib/plan/schema";
import { FIXED_RISK_PERCENT } from "@/lib/plan/risk";

type FallbackInputs = {
  ticker: string;
  timeframe: string;
  holdingPeriod: "Scalp" | "Day" | "Swing" | "Position";
  chartNote?: string;
};

type BuildFallbackPlanArgs = {
  inputs: FallbackInputs;
  learningMode: "standard" | "beginner";
  timeframeMismatchWarning?: string | null;
  trustedSourceLinks?: Plan["trustedSourceLinks"];
};

export function buildFallbackPlan({
  inputs,
  learningMode,
  timeframeMismatchWarning = null,
  trustedSourceLinks = [],
}: BuildFallbackPlanArgs): Plan {
  const chartNote = cleanChartNote(inputs.chartNote);
  const confirmation = extractClause(chartNote, [
    /(?:confirmation|confirm|confirms?)\s+(?:is|if|when)?\s*([^.!?\n]+)/i,
    /(?:only if|wait for)\s+([^.!?\n]+)/i,
  ]);
  const invalidation = extractClause(chartNote, [
    /(?:invalidation|invalid if|wrong if|invalidated if)\s+(?:is|if)?\s*([^.!?\n]+)/i,
    /(?:does not hold|breaks?|close back through)\s+([^.!?\n]+)/i,
  ]);
  const level = extractLikelyPrice(invalidation ?? chartNote);
  const confirmationText =
    confirmation ??
    "price gives visible confirmation at the level described in the chart context";
  const invalidationText =
    invalidation ??
    "price breaks the structure or level that the idea depends on";

  const missingPieces = [
    level ? null : "Exact invalidation level",
    confirmation ? null : "Specific confirmation trigger",
  ].filter(Boolean) as string[];

  const plan: Plan = {
    disclaimer:
      "NOT FINANCIAL ADVICE. Educational and paper-trading planning only. This is a structured practice plan, not a prediction or instruction to trade.",
    riskNotes: [
      `Risk is fixed at ${FIXED_RISK_PERCENT}; do not widen the idea to make a trade fit.`,
      timeframeMismatchWarning ??
        `${inputs.timeframe} ${inputs.holdingPeriod.toLowerCase()} plans can move quickly, so confirmation and invalidation need to be checked before any paper entry.`,
      "If the setup is still vague, stand aside and gather better chart evidence before practicing it.",
    ],
    invalidation: {
      price: level,
      condition: `The practice idea is invalid if ${invalidationText}.`,
    },
    bullishScenario:
      `Bullish practice case: ${inputs.ticker} holds the important level, confirms with follow-through, and does not violate the invalidation condition.`,
    bearishScenario:
      `Bearish or failure case: ${inputs.ticker} rejects the level, loses structure, or moves through invalidation before confirmation appears.`,
    examplePlan: {
      direction: "stand-aside",
      entryTrigger: `Stand aside until ${confirmationText}.`,
      stopConcept:
        "The stop concept belongs beyond the invalidation condition. If that condition happens, the practice idea is wrong.",
      profitTargets: [
        "First target: the nearest prior reaction area or range midpoint.",
        "Second target: the next obvious support/resistance area, only if the first target is reached cleanly.",
      ],
      positionSizingNote:
        `Position size should be calculated from the fixed ${FIXED_RISK_PERCENT} risk guardrail and the distance to invalidation. Do not size from excitement or conviction.`,
    },
    decisionChecklist: [
      "Do not paper-enter before confirmation appears.",
      "Do not enter if invalidation has already happened.",
      "Do not chase after price has moved away from the planned level.",
      "Review news, liquidity, and volatility before practicing the setup.",
    ],
    journalPrompt:
      "Did I wait for confirmation and respect invalidation, or did I force the idea because I wanted a trade?",
    timeframeMismatchWarning,
    cognitiveBiases: [
      "Forcing a trade from incomplete chart context",
      "Moving invalidation after the idea starts failing",
    ],
    strategyNotes: {
      plainEnglish:
        `This is a ${inputs.ticker} ${inputs.timeframe} practice plan. The chart context says: ${chartNote}`,
      actionableVersion:
        `I am looking for this setup only if ${confirmationText}. I will not enter if ${invalidationText}.`,
      learningExample:
        "A stronger beginner plan names the level, waits for proof at that level, and knows exactly what would prove the idea wrong before pressing any button.",
      rules: [
        "Wait for confirmation at the planned level.",
        "Respect invalidation immediately.",
        "Skip the plan if price is already far from the level.",
      ],
      avoid: [
        "Do not move invalidation after entry",
        "Do not treat this starter plan as a signal",
      ],
      missingPieces,
    },
    trustedSourceLinks,
  };

  if (learningMode === "beginner") {
    plan.beginnerGuide = {
      simpleSummary:
        "This is a starter practice plan. It gives you a safe structure even when the chart idea is not perfect yet.",
      keyTerms: [
        {
          term: "Confirmation",
          meaning: "The proof you wait for before trusting the idea more.",
          inThisPlan: confirmationText,
        },
        {
          term: "Invalidation",
          meaning: "The thing that proves the idea is wrong.",
          inThisPlan: invalidationText,
        },
        {
          term: "Stand aside",
          meaning: "Doing nothing until the plan has enough proof.",
          inThisPlan:
            "The example plan starts with standing aside because guessing is not planning.",
        },
        {
          term: "Risk",
          meaning: "The small practice loss limit.",
          inThisPlan: `Planifier keeps risk fixed at ${FIXED_RISK_PERCENT}.`,
        },
      ],
      stepByStep: [
        "Find the level the idea depends on.",
        "Wait for confirmation at that level.",
        "Check whether invalidation happened first.",
        "Only practice the plan if the checklist still passes.",
      ],
      riskTranslation:
        `Fixed ${FIXED_RISK_PERCENT} risk means the plan must stay small and controlled even when the idea feels exciting.`,
    };
  }

  return plan;
}

function cleanChartNote(note?: string): string {
  return (
    note?.trim() ||
    "The user has not provided detailed chart context yet. Treat this as a starter plan that needs better confirmation and invalidation."
  );
}

function extractClause(note: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = note.match(pattern);
    const value = match?.[1]?.trim().replace(/[,;:]$/, "");
    if (value && value.length >= 8) return value;
  }
  return null;
}

function extractLikelyPrice(text: string): string | null {
  const match = text.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{3,}(?:\.\d+)?\b/);
  return match?.[0] ?? null;
}
