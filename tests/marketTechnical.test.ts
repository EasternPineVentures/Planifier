import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/kraken";
import {
  buildTechnicalIndicatorRead,
  buildTechnicalIndicatorSeries,
  calculateATR,
  calculateEMA,
  calculateRSI,
  calculateSMA,
  detectTrend,
  findSupportResistance,
  locatePriceInStructure,
} from "@/lib/market/technical";

function candle(index: number, close: number): Candle {
  return {
    time: 1_717_000_000 + index * 60,
    open: close - 1,
    high: close + 2,
    low: close - 3,
    close,
    volume: 100 + index,
  };
}

describe("market technical helpers", () => {
  it("finds nearby support and resistance from recent candles", () => {
    const read = findSupportResistance(
      [candle(0, 100), candle(1, 104), candle(2, 98)],
      3
    );

    expect(read.support).toBe(95);
    expect(read.resistance).toBe(106);
  });

  it("detects simple up, down, and neutral close sequences", () => {
    expect(
      detectTrend([100, 102, 104, 103, 106, 108].map((close, index) =>
        candle(index, close)
      ))
    ).toBe("up");

    expect(
      detectTrend([108, 106, 104, 105, 102, 100].map((close, index) =>
        candle(index, close)
      ))
    ).toBe("down");

    expect(
      detectTrend([100, 103, 101, 104, 102, 103].map((close, index) =>
        candle(index, close)
      ))
    ).toBe("neutral");
  });

  it("locates price inside the recent structure", () => {
    expect(
      locatePriceInStructure({ price: 102, support: 100, resistance: 120 })
    ).toBe("near-support");
    expect(
      locatePriceInStructure({ price: 118, support: 100, resistance: 120 })
    ).toBe("near-resistance");
    expect(
      locatePriceInStructure({ price: 110, support: 100, resistance: 120 })
    ).toBe("middle");
  });

  it("calculates SMA and EMA from enough candle history", () => {
    const candles = [100, 102, 104, 106, 108].map((close, index) =>
      candle(index, close)
    );

    expect(calculateSMA(candles, 3).map((point) => point.value)).toEqual([
      102, 104, 106,
    ]);
    expect(calculateEMA(candles, 3).map((point) => Number(point.value.toFixed(4)))).toEqual([
      102, 104, 106,
    ]);
  });

  it("calculates RSI on directional movement", () => {
    const rising = Array.from({ length: 20 }, (_, index) => candle(index, 100 + index));
    const falling = Array.from({ length: 20 }, (_, index) => candle(index, 120 - index));

    expect(calculateRSI(rising, 14).at(-1)?.value).toBe(100);
    expect(calculateRSI(falling, 14).at(-1)?.value).toBe(0);
  });

  it("calculates ATR from true range", () => {
    const candles = Array.from({ length: 20 }, (_, index) => ({
      time: 1_717_000_000 + index * 60,
      open: 100 + index,
      high: 104 + index,
      low: 98 + index,
      close: 101 + index,
      volume: 100,
    }));

    expect(calculateATR(candles, 14).at(-1)?.value).toBe(6);
  });

  it("builds indicator series and plain-English reads", () => {
    const candles = Array.from({ length: 80 }, (_, index) => ({
      time: 1_717_000_000 + index * 60,
      open: 100 + index,
      high: 103 + index,
      low: 99 + index,
      close: 102 + index,
      volume: index === 79 ? 300 : 100,
    }));

    const series = buildTechnicalIndicatorSeries(candles);
    const read = buildTechnicalIndicatorRead(candles);

    expect(series.ema20.length).toBe(61);
    expect(series.ema50.length).toBe(31);
    expect(read.trend.label).toBe("bullish EMA stack");
    expect(read.momentum.label).toBe("stretched high RSI");
    expect(read.participation.label).toBe("volume expanding");
    expect(read.summary).toContain("Trend:");
  });
});
