import { describe, expect, it } from "vitest";
import {
  buildHeadlineTapeGroups,
  buildNewsTerms,
  parseRssItems,
  type HeadlineTapeItem,
} from "@/lib/news/rss";

describe("news RSS helpers", () => {
  it("builds asset and market context terms for common pairs", () => {
    const terms = buildNewsTerms("BTC/USD");

    expect(terms).toContain("Bitcoin");
    expect(terms).toContain("BTC");
    expect(terms).toContain("ETF");
    expect(terms).toContain("SEC");
  });

  it("parses basic RSS items", () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[Bitcoin ETF demand cools]]></title>
          <link>https://example.com/bitcoin-etf</link>
          <pubDate>Sun, 31 May 2026 04:00:00 GMT</pubDate>
        </item>
      </channel></rss>
    `;

    const items = parseRssItems(xml);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Bitcoin ETF demand cools",
      url: "https://example.com/bitcoin-etf",
      publishedAt: "Sun, 31 May 2026 04:00:00 GMT",
    });
  });

  it("groups headline tape items by asset type", () => {
    const items: HeadlineTapeItem[] = [
      {
        title: "Bitcoin ETF demand cools",
        url: "https://example.com/bitcoin-etf",
        source: "CoinDesk",
        publishedAt: "Sun, 31 May 2026 04:00:00 GMT",
        matchedTerms: [],
        assetType: "crypto",
        assetLabel: "Crypto",
      },
      {
        title: "Stocks open higher",
        url: "https://example.com/stocks-open-higher",
        source: "MarketWatch",
        publishedAt: "Sun, 31 May 2026 05:00:00 GMT",
        matchedTerms: [],
        assetType: "stocks_etfs",
        assetLabel: "Stocks & ETFs",
      },
      {
        title: "Fed speakers watch inflation data",
        url: "https://example.com/fed-inflation",
        source: "CNBC Markets",
        publishedAt: "Sun, 31 May 2026 06:00:00 GMT",
        matchedTerms: [],
        assetType: "macro",
        assetLabel: "Macro",
      },
    ];

    const groups = buildHeadlineTapeGroups(items);

    expect(groups.map((group) => group.label)).toEqual([
      "Crypto",
      "Stocks & ETFs",
      "Macro",
    ]);
    expect(groups[0].items[0].title).toContain("Bitcoin");
    expect(groups[1].items[0].assetType).toBe("stocks_etfs");
    expect(groups[2].items[0].source).toBe("CNBC Markets");
  });
});
