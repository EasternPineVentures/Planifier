import { describe, expect, it } from "vitest";
import {
  analyzeChartWorkspace,
  buildPracticeCandles,
  getDefaultWorkspaceLevels,
  getWorkspacePriceRange,
} from "@/lib/plan/chartWorkspace";

describe("chart workspace", () => {
  it("builds a deterministic practice chart with enough candles", () => {
    const candles = buildPracticeCandles("slide-pressure");

    expect(candles.length).toBeGreaterThan(20);
    expect(candles[0].high).toBeGreaterThan(candles[0].low);
  });

  it("generates sane default levels for a pattern", () => {
    const candles = buildPracticeCandles("support-retest");
    const levels = getDefaultWorkspaceLevels(candles, "support-retest");

    expect(levels.support).toBeLessThan(levels.resistance);
    expect(levels.invalidation).toBeLessThan(levels.support);
  });

  it("returns live feedback and a usable chart note", () => {
    const candles = buildPracticeCandles("slide-pressure");
    const levels = getDefaultWorkspaceLevels(candles, "slide-pressure");
    const feedback = analyzeChartWorkspace({
      pair: "BTC/USD",
      timeframe: "4H",
      pattern: "slide-pressure",
      candles,
      levels,
    });

    expect(feedback.trend).toContain("pressure");
    expect(feedback.chartNote).toContain("BTC/USD");
    expect(feedback.chartNote).toContain("support");
    expect(feedback.chartNote.length).toBeGreaterThan(160);
  });

  it("includes adjusted levels in the workspace price range", () => {
    const candles = buildPracticeCandles("range-chop");
    const range = getWorkspacePriceRange(candles, {
      support: 50,
      resistance: 150,
    });

    expect(range.min).toBeLessThan(50);
    expect(range.max).toBeGreaterThan(150);
  });
});
