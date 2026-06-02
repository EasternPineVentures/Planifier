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

  it("accepts optional beginnerGuide when Still Learning mode provides it", () => {
    const parsed = PlanSchema.parse({
      ...basePlan,
      beginnerGuide: {
        simpleSummary:
          "This is a practice plan that waits for proof before doing anything.",
        keyTerms: [
          {
            term: "Confirmation",
            meaning: "A clue that makes the idea stronger.",
            inThisPlan: "Wait for support to hold before practicing the setup.",
          },
          {
            term: "Invalidation",
            meaning: "The line where the idea is wrong.",
            inThisPlan: "The idea is wrong below 100.",
          },
          {
            term: "Risk",
            meaning: "The small practice loss limit.",
            inThisPlan: "Risk is fixed at 1%.",
          },
        ],
        stepByStep: [
          "Read the idea.",
          "Wait for confirmation.",
          "Respect invalidation.",
        ],
        riskTranslation:
          "Risk is locked at 1%, so the practice plan focuses on losing small.",
      },
    });

    expect(parsed.beginnerGuide?.keyTerms.map((item) => item.term)).toContain(
      "Invalidation"
    );
  });
});
