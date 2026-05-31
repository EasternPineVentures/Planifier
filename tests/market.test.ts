import { describe, expect, it } from "vitest";
import { intervalToMinutes, normalizeKrakenPair } from "@/lib/market/kraken";

describe("Kraken market helpers", () => {
  it("normalizes common crypto pairs for Kraken", () => {
    expect(normalizeKrakenPair("BTC/USD")).toBe("XBTUSD");
    expect(normalizeKrakenPair("ETH/USD")).toBe("ETHUSD");
    expect(normalizeKrakenPair("xbt/usd")).toBe("XBTUSD");
  });

  it("maps supported Planifier timeframes to Kraken intervals", () => {
    expect(intervalToMinutes("15m")).toBe(15);
    expect(intervalToMinutes("1H")).toBe(60);
    expect(intervalToMinutes("4H")).toBe(240);
    expect(intervalToMinutes("daily")).toBe(1440);
  });

  it("defaults unclear timeframes to 4H", () => {
    expect(intervalToMinutes("nonsense")).toBe(240);
    expect(intervalToMinutes(undefined)).toBe(240);
  });
});
