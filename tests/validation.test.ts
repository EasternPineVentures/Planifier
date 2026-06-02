import { describe, expect, it } from "vitest";
import {
  MIN_CHART_NOTE_CHARS,
  hasUsefulChartNote,
  validateInputs,
  type PlanInputs,
} from "@/lib/validation";

const baseInputs: PlanInputs = {
  ticker: "BTC/USD",
  timeframe: "4H",
  holdingPeriod: "Swing",
  riskPercent: "1%",
};

describe("chart context validation", () => {
  it("rejects filler text that only satisfies the old length rule", () => {
    const missing = validateInputs({
      ...baseInputs,
      chartNote: "random test test test",
    });

    expect(missing).toContain("chart");
  });

  it("accepts a useful written chart note", () => {
    const note =
      "BTC/USD on the 4H chart is testing resistance after forming higher lows. " +
      "Volume is mixed, so I want confirmation on a close above the level and a retest. " +
      "A close back below the higher-low structure would invalidate the idea.";

    expect(note.length).toBeGreaterThanOrEqual(MIN_CHART_NOTE_CHARS);
    expect(hasUsefulChartNote(note)).toBe(true);
    expect(validateInputs({ ...baseInputs, chartNote: note })).not.toContain("chart");
  });

  it("accepts an uploaded image without requiring a long note", () => {
    expect(
      validateInputs({
        ...baseInputs,
        hasImage: true,
        chartNote: "",
      })
    ).not.toContain("chart");
  });

  it("keeps risk locked to 1%", () => {
    const missing = validateInputs({
      ...baseInputs,
      riskPercent: "2%",
      hasImage: true,
    });

    expect(missing).toContain("riskPercent");
  });
});
