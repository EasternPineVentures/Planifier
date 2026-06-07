import { describe, expect, it } from "vitest";
import {
  buildTradingViewChartUrl,
  calculateRiskReward,
  explainLearningCandle,
  findLearningChartPair,
  normalizeLearningChartTimeframe,
  summarizeLatestPrice,
} from "@/lib/market/learningChart";
import type { Candle } from "@/lib/market/kraken";

const greenCandle: Candle = {
  time: 1_717_000_000,
  open: 100,
  high: 112,
  low: 97,
  close: 110,
  volume: 1450,
};

const previousCandle: Candle = {
  time: 1_716_985_600,
  open: 98,
  high: 103,
  low: 95,
  close: 99,
  volume: 900,
};

describe("learning chart helpers", () => {
  it("normalizes only supported learning chart timeframes", () => {
    expect(normalizeLearningChartTimeframe("1H")).toBe("1h");
    expect(normalizeLearningChartTimeframe("4h")).toBe("4h");
    expect(normalizeLearningChartTimeframe("daily")).toBe("4h");
    expect(normalizeLearningChartTimeframe(undefined)).toBe("4h");
  });

  it("finds supported Kraken learning pairs", () => {
    expect(findLearningChartPair("BTC/USD")?.krakenPair).toBe("XBTUSD");
    expect(findLearningChartPair("eth-usd")?.symbol).toBe("ETH/USD");
    expect(findLearningChartPair("doge-usd")?.krakenPair).toBe("XDGUSD");
    expect(findLearningChartPair("LINK/USD")?.label).toContain("Chainlink");
    expect(findLearningChartPair("AAPL")).toBeNull();
  });

  it("calculates a valid long practice R/R", () => {
    const readout = calculateRiskReward({
      entry: 100,
      stop: 95,
      target: 115,
    });

    expect(readout.status).toBe("valid");
    expect(readout.direction).toBe("long");
    expect(readout.ratio).toBe(3);
    expect(readout.label).toBe("3.00R");
  });

  it("rejects a stop on the wrong side of a short map", () => {
    const readout = calculateRiskReward({
      entry: 100,
      stop: 98,
      target: 90,
    });

    expect(readout.status).toBe("invalid");
    expect(readout.direction).toBe("short");
    expect(readout.explanation).toContain("above entry");
  });

  it("explains body, wick, volume, and previous-close context", () => {
    const explanation = explainLearningCandle(greenCandle, previousCandle);

    expect(explanation.direction).toBe("green");
    expect(explanation.headline).toContain("closed higher");
    expect(explanation.bodyRead).toContain("large");
    expect(explanation.volumeRead).toContain("Volume");
    expect(explanation.beginnerSteps.join(" ")).toContain("previous candle close");
  });

  it("summarizes latest price change", () => {
    const readout = summarizeLatestPrice([previousCandle, greenCandle]);

    expect(readout.last?.close).toBe(110);
    expect(readout.previous?.close).toBe(99);
    expect(readout.change).toBe(11);
    expect(readout.changePercent).toBe(11.1111);
  });

  it("builds TradingView chart links for Kraken symbols and intervals", () => {
    const url = new URL(
      buildTradingViewChartUrl({
        symbol: "BTC/USD",
        timeframe: "4h",
        time: greenCandle.time,
      })
    );

    expect(url.origin).toBe("https://www.tradingview.com");
    expect(url.searchParams.get("symbol")).toBe("KRAKEN:BTCUSD");
    expect(url.searchParams.get("interval")).toBe("240");
    expect(url.searchParams.get("time_from")).toBe(String(greenCandle.time));
  });
});
