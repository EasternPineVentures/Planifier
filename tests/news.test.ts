import { describe, expect, it } from "vitest";
import { buildNewsTerms, parseRssItems } from "@/lib/news/rss";

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
});
