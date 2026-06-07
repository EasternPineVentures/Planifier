import { z } from "zod";
import { getHeadlineTapeSnapshot } from "@/lib/news/rss";
import {
  buildFallbackMarketImpactSnapshot,
  buildMarketImpactSnapshot,
  type TradingEconomicsCalendarEvent,
} from "@/lib/market/impact";

export const runtime = "nodejs";
export const revalidate = 300;

const querySchema = z.object({
  pair: z.string().optional(),
});

const CALENDAR_TIMEOUT_MS = 8000;
const CALENDAR_WINDOW_DAYS = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid market impact request.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const pair = parsed.data.pair?.trim() || "BTC/USD";
  const now = new Date();
  const sourceNotes: string[] = [];
  const headlineSnapshot = await getHeadlineTapeSnapshot().catch((error) => {
    sourceNotes.push(
      `Headline RSS unavailable: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
    return null;
  });

  const apiKey = process.env.TRADING_ECONOMICS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      buildFallbackMarketImpactSnapshot({
        pair,
        headlineSnapshot,
        now,
        sourceNotes: [
          ...sourceNotes,
          "Set TRADING_ECONOMICS_API_KEY to enable dated economic calendar events.",
        ],
      }),
      responseOptions()
    );
  }

  try {
    const rawEvents = await fetchTradingEconomicsCalendar({ apiKey, now });
    return Response.json(
      buildMarketImpactSnapshot({
        pair,
        rawEvents,
        headlineSnapshot,
        sourceStatus: "live",
        sourceNotes: [...sourceNotes, "Trading Economics calendar checked."],
        now,
      }),
      responseOptions()
    );
  } catch (error) {
    return Response.json(
      buildFallbackMarketImpactSnapshot({
        pair,
        headlineSnapshot,
        now,
        sourceStatus: "error",
        sourceNotes: [
          ...sourceNotes,
          `Economic calendar unavailable: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        ],
      }),
      responseOptions()
    );
  }
}

async function fetchTradingEconomicsCalendar({
  apiKey,
  now,
}: {
  apiKey: string;
  now: Date;
}): Promise<TradingEconomicsCalendarEvent[]> {
  const from = formatDatePath(now);
  const to = formatDatePath(
    new Date(now.getTime() + CALENDAR_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  );
  const calendarUrl = new URL(
    `https://api.tradingeconomics.com/calendar/country/united%20states/${from}/${to}`
  );
  calendarUrl.searchParams.set("c", apiKey);
  calendarUrl.searchParams.set("f", "json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALENDAR_TIMEOUT_MS);
  try {
    const response = await fetch(calendarUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Planifier/0.1 educational market context",
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Trading Economics HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("Trading Economics response was not an event list");
    }
    return payload as TradingEconomicsCalendarEvent[];
  } finally {
    clearTimeout(timeout);
  }
}

function formatDatePath(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function responseOptions() {
  return {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  };
}
