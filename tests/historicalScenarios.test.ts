import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/kraken";
import {
  buildHistoricalScenarioMap,
  detectPatterns,
  extractStructureFeatures,
  holdingPeriodToOutcomeWindow,
  normalizeHistoricalCandles,
  type StructureFeatures,
} from "@/lib/plan/historicalScenarios";

describe("historical scenario engine", () => {
  it("normalizes candles by sorting and marking them committed", () => {
    const candles = normalizeHistoricalCandles({
      candles: [
        candle(2, 102),
        candle(1, 100),
      ],
      source: "fixture",
      intervalMinutes: 60,
    });

    expect(candles.map((item) => item.time)).toEqual([1, 2]);
    expect(candles.every((item) => item.committed)).toBe(true);
    expect(candles[0].source).toBe("fixture");
  });

  it("extracts range and trend features from candles", () => {
    const features = extractStructureFeatures(makeFixtureCandles(90));

    expect(features.support).toBeLessThan(features.resistance);
    expect(features.rangeWidth).toBeGreaterThan(0);
    expect(["uptrend", "downtrend", "sideways"]).toContain(features.trendLabel);
  });

  it("detects range-middle as a valid rule-based candidate", () => {
    const patterns = detectPatterns({
      ...baseFeatures(),
      trendLabel: "sideways",
      rangePosition: "middle of range",
      recentBreakout: false,
      recentBreakdown: false,
    });

    const rangeMiddle = patterns.find((item) => item.patternId === "range-middle");
    expect(rangeMiddle?.detected).toBe(true);
  });

  it("builds a historical scenario map with three branches", () => {
    const normalized = normalizeHistoricalCandles({
      candles: makeFixtureCandles(180),
      source: "fixture",
      intervalMinutes: 60,
    });
    const scenario = buildHistoricalScenarioMap({
      pair: "BTC/USD",
      timeframe: "1H",
      holdingPeriod: "Swing",
      candles: normalized,
    });

    expect(scenario.branches).toHaveLength(3);
    expect(scenario.evidence.historicalSampleCount).toBeGreaterThanOrEqual(0);
    expect(scenario.chartNoteSeed).toContain("BTC/USD 1H");
  });

  it("maps holding periods to larger outcome windows", () => {
    expect(holdingPeriodToOutcomeWindow("Scalp")).toBeLessThan(
      holdingPeriodToOutcomeWindow("Swing")
    );
    expect(holdingPeriodToOutcomeWindow("Swing")).toBeLessThan(
      holdingPeriodToOutcomeWindow("Position")
    );
  });
});

function candle(time: number, close: number): Candle {
  return {
    time,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100 + time,
  };
}

function makeFixtureCandles(count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 5) * 3;
    const close = 100 + index * 0.04 + wave;
    return candle(index + 1, Number(close.toFixed(4)));
  });
}

function baseFeatures(): StructureFeatures {
  return {
    lastClose: 105,
    support: 100,
    resistance: 110,
    midpoint: 105,
    rangeWidth: 10,
    averageRange: 1.5,
    trendLabel: "sideways",
    rangePosition: "middle of range",
    distanceToSupport: 0.5,
    distanceToResistance: 0.5,
    recentBreakout: false,
    recentBreakdown: false,
    failedBreakout: false,
    failedBreakdown: false,
  };
}
