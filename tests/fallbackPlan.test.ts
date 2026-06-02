import { describe, expect, it } from "vitest";
import { PlanSchema } from "@/lib/plan/schema";
import { buildFallbackPlan } from "@/lib/plan/fallbackPlan";

describe("buildFallbackPlan", () => {
  it("returns a valid starter plan instead of blocking when AI output fails", () => {
    const plan = buildFallbackPlan({
      learningMode: "beginner",
      inputs: {
        ticker: "BTC/USD",
        timeframe: "15m",
        holdingPeriod: "Day",
        chartNote:
          "BTC/USD 15m is in a downtrend and currently middle of range. I am looking for a continuation plan only if price confirms the level and does not chase. Invalidation is a close back through the level that should hold.",
      },
      trustedSourceLinks: [],
    });

    const parsed = PlanSchema.parse(plan);
    expect(parsed.examplePlan.direction).toBe("stand-aside");
    expect(parsed.strategyNotes.missingPieces).toContain(
      "Exact invalidation level"
    );
    expect(parsed.beginnerGuide?.keyTerms.map((term) => term.term)).toContain(
      "Confirmation"
    );
  });

  it("extracts a numeric invalidation when the user gives one", () => {
    const plan = buildFallbackPlan({
      learningMode: "standard",
      inputs: {
        ticker: "ETH/USD",
        timeframe: "1H",
        holdingPeriod: "Swing",
        chartNote:
          "ETH/USD is retesting support. Confirmation is a reclaim above 3100. Wrong if 2980 breaks on a close.",
      },
    });

    expect(plan.invalidation.price).toBe("2980");
    expect(plan.strategyNotes.missingPieces).not.toContain(
      "Exact invalidation level"
    );
  });
});
