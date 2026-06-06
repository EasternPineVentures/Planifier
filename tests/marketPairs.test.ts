import { describe, expect, it } from "vitest";
import {
  getAllMarketPairSymbols,
  getMarketPairOption,
  MARKET_PAIR_GROUPS,
  QUICK_START_PAIR_SYMBOLS,
} from "@/lib/plan/marketPairs";

describe("market pair catalog", () => {
  it("groups common markets for the beginner selector", () => {
    const groupLabels = MARKET_PAIR_GROUPS.map((group) => group.label);

    expect(groupLabels).toContain("Crypto");
    expect(groupLabels).toContain("Stocks");
    expect(groupLabels).toContain("Forex");
  });

  it("looks up known symbols with beginner-friendly context", () => {
    const btc = getMarketPairOption("btc/usd");

    expect(btc?.symbol).toBe("BTC/USD");
    expect(btc?.plainEnglish).toContain("crypto chart");
  });

  it("keeps quick-start symbols inside the full catalog", () => {
    const symbols = getAllMarketPairSymbols();

    for (const symbol of QUICK_START_PAIR_SYMBOLS) {
      expect(symbols).toContain(symbol);
    }
  });
});
