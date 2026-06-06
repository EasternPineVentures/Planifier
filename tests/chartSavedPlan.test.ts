import { describe, expect, it } from "vitest";
import {
  buildChartSavedPlan,
  inferHoldingPeriod,
} from "@/lib/plan/chartSavedPlan";
import { PlanSchema } from "@/lib/plan/schema";

describe("chart-saved plan builder", () => {
  it("builds a structured Planifier plan from chart levels", () => {
    const result = buildChartSavedPlan({
      symbol: "BTC/USD",
      timeframe: "4h",
      entry: 64000,
      stop: 62000,
      target: 68000,
      riskReward: 2,
      currentPrice: 64150,
      selectedCandleTime: "Jun 5, 2026 1:00 PM",
      notes: "Practice map from the chart.",
    });

    const parsed = PlanSchema.parse(result.plan);

    expect(result.holdingPeriod).toBe("Swing");
    expect(result.chartNote).toContain("Learning Chart V1");
    expect(parsed.chartSave?.origin).toBe("learning_chart_v1");
    expect(parsed.chartSave?.entry).toBe(64000);
    expect(parsed.chartSave?.riskReward).toBe(2);
    expect(parsed.chartSave?.tradingViewUrl).toContain("KRAKEN%3ABTCUSD");
    expect(parsed.examplePlan.direction).toBe("long");
    expect(parsed.invalidation.price).toBe("62,000");
    expect(parsed.strategyNotes.plainEnglish).toContain("2.00R");
    expect(parsed.beginnerGuide?.keyTerms.map((item) => item.term)).toContain(
      "R/R"
    );
  });

  it("infers sensible holding periods from chart timeframes", () => {
    expect(inferHoldingPeriod("1m")).toBe("Scalp");
    expect(inferHoldingPeriod("15m")).toBe("Day");
    expect(inferHoldingPeriod("4h")).toBe("Swing");
    expect(inferHoldingPeriod("mystery")).toBe("Day");
  });
});
