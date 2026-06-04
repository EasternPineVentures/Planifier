import { describe, expect, it } from "vitest";
import {
  getBeginnerCoachMessage,
  normalizeBeginnerExplorePair,
} from "@/lib/plan/beginnerCoach";

describe("beginner coach", () => {
  it("normalizes common crypto symbols into beginner-friendly pairs", () => {
    expect(normalizeBeginnerExplorePair("BTC")).toBe("BTC/USD");
    expect(normalizeBeginnerExplorePair("ETHUSDT")).toBe("ETH/USD");
    expect(normalizeBeginnerExplorePair("SPY")).toBe("SPY");
  });

  it("turns a rough market thought into a next beginner step", () => {
    const message = getBeginnerCoachMessage({
      inputs: {
        ticker: "BTC",
        riskPercent: "1%",
        chartNote:
          "I would like to see how far BTC can slide because there is not much buying conviction from what I can tell.",
      },
      missing: ["timeframe", "holdingPeriod"],
    });

    expect(message).toContain("BTC/USD");
    expect(message).toContain("choose one timeframe and style");
    expect(message).toContain("Find starting angles");
  });

  it("teaches chart scanning when only chart context is missing", () => {
    const message = getBeginnerCoachMessage({
      inputs: {
        ticker: "BTC/USD",
        timeframe: "4H",
        holdingPeriod: "Swing",
        riskPercent: "1%",
      },
      missing: ["chart"],
    });

    expect(message).toContain("scan the chart");
    expect(message).toContain("trend");
    expect(message).toContain("key level");
  });
});
