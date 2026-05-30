import { describe, expect, it } from "vitest";
import { PlanSchema } from "@/lib/plan/schema";

describe("PlanSchema strategyNotes.learningExample", () => {
  const basePlan = {
    disclaimer: "NOT FINANCIAL ADVICE. Educational only.",
    riskNotes: ["Volatility can invalidate the setup quickly."],
    invalidation: {
      price: "100",
      condition: "Close below 100 on 1H.",
    },
    bullishScenario: "Bullish if support holds and buyers reclaim prior high.",
    bearishScenario: "Bearish if support fails and volume expands on breakdown.",
    examplePlan: {
      direction: "either" as const,
      entryTrigger: "Wait for confirmation candle and volume expansion.",
      stopConcept: "Stop beyond invalidation level.",
      profitTargets: ["Prior range midpoint", "Range high"],
      positionSizingNote: "Size from fixed risk per trade.",
    },
    decisionChecklist: [
      "Do not enter without confirmation.",
      "Respect invalidation.",
      "Skip if liquidity is thin.",
    ],
    journalPrompt: "What signal quality did you actually trade?",
    timeframeMismatchWarning: null,
    cognitiveBiases: null,
    strategyNotes: {
      plainEnglish: "This is a conditional mean-reversion idea.",
      actionableVersion:
        "I am looking for a hold at support only if higher low forms with stronger volume.",
      rules: ["Wait for hold", "Require higher low"],
      avoid: ["Do not move invalidation after entry"],
      missingPieces: [],
    },
    trustedSourceLinks: [],
  };

  it("accepts plans without learningExample for legacy compatibility", () => {
    const parsed = PlanSchema.parse(basePlan);
    expect(parsed.strategyNotes.learningExample).toBeUndefined();
  });

  it("accepts optional learningExample when provided", () => {
    const parsed = PlanSchema.parse({
      ...basePlan,
      strategyNotes: {
        ...basePlan.strategyNotes,
        learningExample:
          "A trader might wait for support to hold, then require higher low plus stronger volume before considering entry.",
      },
    });

    expect(parsed.strategyNotes.learningExample).toContain("support");
  });
});
