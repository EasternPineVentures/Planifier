import { describe, expect, it } from "vitest";
import { buildSourceLinks } from "@/lib/sources/sourceLinks";

describe("buildSourceLinks", () => {
  it("crypto BTC returns TradingView and CoinGecko links", () => {
    const links = buildSourceLinks({ assetTicker: "BTC/USD", assetType: "crypto" });
    const labels = links.map((l) => l.label);

    expect(labels).toContain("TradingView");
    expect(labels).toContain("CoinGecko");
  });

  it("stock NVDA returns TradingView, Nasdaq, and SEC EDGAR links", () => {
    const links = buildSourceLinks({ assetTicker: "NVDA", assetType: "stock" });
    const labels = links.map((l) => l.label);

    expect(labels).toContain("TradingView");
    expect(labels).toContain("Nasdaq");
    expect(labels).toContain("SEC EDGAR");
  });

  it("forex EUR/USD returns TradingView only for requested categories", () => {
    const links = buildSourceLinks({ assetTicker: "EUR/USD", assetType: "forex" });
    const labels = links.map((l) => l.label);

    expect(labels).toContain("TradingView");
    expect(labels).not.toContain("CoinGecko");
    expect(labels).not.toContain("CoinMarketCap");
    expect(labels).not.toContain("SEC EDGAR");
  });

  it("unknown ticker returns TradingView search only", () => {
    const links = buildSourceLinks({ assetTicker: "MYSTERY", assetType: "unknown" });

    expect(links).toHaveLength(1);
    expect(links[0].label).toBe("TradingView");
  });

  it("sanitizes ticker and prevents unsafe URL output", () => {
    const links = buildSourceLinks({ assetTicker: "<script>alert(1)</script>BTC" });

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.url).not.toContain("<script>");
      expect(link.url).toMatch(/^https:\/\//);
    }
  });
});
