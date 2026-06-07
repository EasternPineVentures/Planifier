import { describe, expect, it } from "vitest";
import {
  buildFallbackMarketImpactSnapshot,
  buildHeadlineImpactItems,
  buildMarketImpactSnapshot,
  normalizeTradingEconomicsEvents,
  type TradingEconomicsCalendarEvent,
} from "@/lib/market/impact";
import type { HeadlineTapeSnapshot } from "@/lib/news/rss";

const now = new Date("2026-06-07T12:00:00.000Z");

describe("market impact helpers", () => {
  it("normalizes Trading Economics calendar events into beginner context", () => {
    const raw: TradingEconomicsCalendarEvent[] = [
      {
        CalendarId: "1",
        Date: "2026-06-10T12:30:00",
        Country: "United States",
        Category: "Inflation Rate",
        Event: "CPI YoY",
        Previous: "3.1%",
        Forecast: "3.0%",
        Importance: 3,
        URL: "/united-states/inflation-cpi",
      },
    ];

    const events = normalizeTradingEconomicsEvents(raw, now);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "CPI YoY",
      importance: "high",
      impactArea: "inflation",
      previous: "3.1%",
      forecast: "3.0%",
      sourceUrl: "https://tradingeconomics.com/united-states/inflation-cpi",
    });
  });

  it("builds a fallback snapshot when no dated calendar events are available", () => {
    const snapshot = buildFallbackMarketImpactSnapshot({
      pair: "BTC/USD",
      headlineSnapshot: null,
      now,
      sourceNotes: ["provider not configured"],
    });

    expect(snapshot.source).toBe("educational_fallback");
    expect(snapshot.educationalOnly).toBe(true);
    expect(snapshot.events[0].title).toBe("Inflation data watch");
    expect(snapshot.sourceNotes).toContain("provider not configured");
  });

  it("builds a live snapshot when calendar events exist", () => {
    const snapshot = buildMarketImpactSnapshot({
      pair: "BTC/USD",
      rawEvents: [
        {
          CalendarId: "2",
          Date: "2026-06-11T18:00:00",
          Country: "United States",
          Category: "Interest Rate",
          Event: "Fed Interest Rate Decision",
          Importance: 3,
        },
      ],
      headlineSnapshot: null,
      now,
    });

    expect(snapshot.source).toBe("trading_economics");
    expect(snapshot.sourceStatus).toBe("live");
    expect(snapshot.events[0].impactArea).toBe("rates");
  });

  it("classifies headline impact from the existing headline tape", () => {
    const headlineSnapshot: HeadlineTapeSnapshot = {
      generatedAt: now.toISOString(),
      sourceNotes: [],
      groups: [
        {
          assetType: "macro",
          label: "Macro",
          items: [
            {
              title: "Fed decision keeps markets on edge",
              url: "https://example.com/fed",
              source: "CNBC Markets",
              publishedAt: "2026-06-07T11:00:00.000Z",
              matchedTerms: [],
              assetType: "macro",
              assetLabel: "Macro",
            },
          ],
        },
      ],
    };

    const headlines = buildHeadlineImpactItems(headlineSnapshot, "BTC/USD");

    expect(headlines).toHaveLength(1);
    expect(headlines[0].impactArea).toBe("rates");
  });
});
