import type { HeadlineTapeSnapshot } from "@/lib/news/rss";

export type MarketImpactImportance = "high" | "medium" | "low" | "watch";

export type MarketImpactArea =
  | "rates"
  | "inflation"
  | "labor"
  | "growth"
  | "liquidity"
  | "regulation"
  | "risk";

export type MarketImpactEvent = {
  id: string;
  title: string;
  category: string;
  country: string;
  startsAt: string | null;
  timeLabel: string | null;
  importance: MarketImpactImportance;
  impactArea: MarketImpactArea;
  actual: string | null;
  previous: string | null;
  forecast: string | null;
  source: string;
  sourceUrl: string | null;
  beginnerNote: string;
};

export type MarketHeadlineImpact = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  impactArea: MarketImpactArea;
  beginnerNote: string;
};

export type MarketImpactSnapshot = {
  generatedAt: string;
  pair: string;
  windowLabel: string;
  source: "trading_economics" | "educational_fallback";
  sourceStatus: "live" | "fallback" | "error";
  sourceLabel: string;
  events: MarketImpactEvent[];
  headlines: MarketHeadlineImpact[];
  sourceNotes: string[];
  educationalOnly: true;
};

export type TradingEconomicsCalendarEvent = {
  CalendarId?: string | number | null;
  Date?: string | null;
  Country?: string | null;
  Category?: string | null;
  Event?: string | null;
  Actual?: string | number | null;
  Previous?: string | number | null;
  Forecast?: string | number | null;
  Importance?: string | number | null;
  Source?: string | null;
  URL?: string | null;
  Symbol?: string | null;
};

const HIGH_IMPACT_TERMS = [
  "fomc",
  "fed",
  "interest rate",
  "inflation",
  "cpi",
  "pce",
  "ppi",
  "payroll",
  "unemployment",
  "jobs",
  "gdp",
  "retail sales",
  "ism",
  "pmi",
  "consumer confidence",
  "jolts",
  "treasury",
];

export function buildMarketImpactSnapshot({
  pair,
  rawEvents,
  headlineSnapshot,
  sourceStatus = "live",
  sourceNotes = [],
  now = new Date(),
}: {
  pair: string;
  rawEvents: TradingEconomicsCalendarEvent[];
  headlineSnapshot: HeadlineTapeSnapshot | null;
  sourceStatus?: "live" | "fallback" | "error";
  sourceNotes?: string[];
  now?: Date;
}): MarketImpactSnapshot {
  const events = normalizeTradingEconomicsEvents(rawEvents, now);
  if (events.length === 0) {
    return buildFallbackMarketImpactSnapshot({
      pair,
      headlineSnapshot,
      now,
      sourceStatus: sourceStatus === "live" ? "fallback" : sourceStatus,
      sourceNotes,
    });
  }

  return {
    generatedAt: now.toISOString(),
    pair,
    windowLabel: "Next 10 days",
    source: "trading_economics",
    sourceStatus,
    sourceLabel: "Trading Economics calendar + public RSS",
    events,
    headlines: buildHeadlineImpactItems(headlineSnapshot, pair),
    sourceNotes,
    educationalOnly: true,
  };
}

export function normalizeTradingEconomicsEvents(
  rawEvents: TradingEconomicsCalendarEvent[],
  now = new Date()
): MarketImpactEvent[] {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  return rawEvents
    .map((event) => normalizeTradingEconomicsEvent(event))
    .filter((event): event is MarketImpactEvent => !!event)
    .filter((event) => {
      if (!event.startsAt) return true;
      const startsAt = Date.parse(event.startsAt);
      return Number.isFinite(startsAt) && startsAt >= todayStart.getTime();
    })
    .filter(
      (event) =>
        event.importance !== "low" || hasHighImpactTerm(event.title, event.category)
    )
    .sort((a, b) => {
      const aTime = a.startsAt ? Date.parse(a.startsAt) : Number.MAX_SAFE_INTEGER;
      const bTime = b.startsAt ? Date.parse(b.startsAt) : Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return importanceScore(b.importance) - importanceScore(a.importance);
    })
    .slice(0, 8);
}

export function buildFallbackMarketImpactSnapshot({
  pair,
  headlineSnapshot,
  now = new Date(),
  sourceStatus = "fallback",
  sourceNotes = [],
}: {
  pair: string;
  headlineSnapshot: HeadlineTapeSnapshot | null;
  now?: Date;
  sourceStatus?: "fallback" | "error";
  sourceNotes?: string[];
}): MarketImpactSnapshot {
  const events: MarketImpactEvent[] = [
    {
      id: "fallback-inflation",
      title: "Inflation data watch",
      category: "CPI / PCE / PPI",
      country: "United States",
      startsAt: null,
      timeLabel: "Check this week's calendar",
      importance: "high",
      impactArea: "inflation",
      actual: null,
      previous: null,
      forecast: null,
      source: "Planifier education fallback",
      sourceUrl: null,
      beginnerNote:
        "Inflation reports can move rates, the dollar, indexes, and crypto. Wait for the first reaction to settle before trusting a candle.",
    },
    {
      id: "fallback-rates",
      title: "Fed and rate decision watch",
      category: "FOMC / Fed speakers",
      country: "United States",
      startsAt: null,
      timeLabel: "Check before planning",
      importance: "high",
      impactArea: "rates",
      actual: null,
      previous: null,
      forecast: null,
      source: "Planifier education fallback",
      sourceUrl: null,
      beginnerNote:
        "Rate news can reset risk appetite quickly. Treat candles around Fed events as higher-noise practice until structure becomes clear.",
    },
    {
      id: "fallback-labor",
      title: "Jobs data watch",
      category: "Payrolls / unemployment",
      country: "United States",
      startsAt: null,
      timeLabel: "Often early US session",
      importance: "medium",
      impactArea: "labor",
      actual: null,
      previous: null,
      forecast: null,
      source: "Planifier education fallback",
      sourceUrl: null,
      beginnerNote:
        "Labor data can change rate expectations. If the chart spikes both ways, wait for a cleaner close.",
    },
  ];

  return {
    generatedAt: now.toISOString(),
    pair,
    windowLabel: "Setup needed",
    source: "educational_fallback",
    sourceStatus,
    sourceLabel: "Education fallback + public RSS",
    events,
    headlines: buildHeadlineImpactItems(headlineSnapshot, pair),
    sourceNotes,
    educationalOnly: true,
  };
}

export function buildHeadlineImpactItems(
  snapshot: HeadlineTapeSnapshot | null,
  pair: string,
  maxItems = 4
): MarketHeadlineImpact[] {
  if (!snapshot) return [];
  const base = pair.split("/")[0]?.toLowerCase() ?? "";

  return snapshot.groups
    .flatMap((group) => group.items)
    .filter((item) => {
      if (item.assetType === "macro") return true;
      if (item.assetType === "crypto") {
        const title = item.title.toLowerCase();
        return (
          ["btc", "bitcoin", "eth", "ether", "crypto", base].some((term) =>
            title.includes(term)
          ) || isCryptoPair(pair)
        );
      }
      return !isCryptoPair(pair);
    })
    .sort((a, b) => dateMs(b.publishedAt) - dateMs(a.publishedAt))
    .slice(0, maxItems)
    .map((item) => {
      const impactArea = classifyImpactArea(`${item.title} ${item.assetLabel}`);
      return {
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        impactArea,
        beginnerNote: headlineNote(impactArea),
      };
    });
}

function normalizeTradingEconomicsEvent(
  raw: TradingEconomicsCalendarEvent
): MarketImpactEvent | null {
  const title = cleanValue(raw.Event) ?? cleanValue(raw.Category);
  if (!title) return null;
  const category = cleanValue(raw.Category) ?? "Economic event";
  const startsAt = normalizeDate(raw.Date);
  const importance = normalizeImportance(raw.Importance);
  const impactArea = classifyImpactArea(`${title} ${category}`);

  return {
    id: `te-${cleanValue(raw.CalendarId) ?? cleanValue(raw.Symbol) ?? title}`,
    title,
    category,
    country: cleanValue(raw.Country) ?? "United States",
    startsAt,
    timeLabel: null,
    importance,
    impactArea,
    actual: cleanValue(raw.Actual),
    previous: cleanValue(raw.Previous),
    forecast: cleanValue(raw.Forecast),
    source: cleanValue(raw.Source) ?? "Trading Economics",
    sourceUrl: normalizeTradingEconomicsUrl(raw.URL),
    beginnerNote: eventNote(impactArea),
  };
}

function normalizeImportance(value: string | number | null | undefined): MarketImpactImportance {
  const numberValue =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (numberValue >= 3) return "high";
  if (numberValue === 2) return "medium";
  if (numberValue === 1) return "low";
  return "watch";
}

function classifyImpactArea(text: string): MarketImpactArea {
  const value = text.toLowerCase();
  if (/(fomc|fed|interest rate|treasury|yield)/.test(value)) return "rates";
  if (/(inflation|cpi|pce|ppi|prices)/.test(value)) return "inflation";
  if (/(payroll|employment|unemployment|job|jolts|claims)/.test(value)) {
    return "labor";
  }
  if (/(gdp|retail|sales|consumer|pmi|ism|confidence)/.test(value)) {
    return "growth";
  }
  if (/(liquidity|auction|balance sheet|money supply)/.test(value)) {
    return "liquidity";
  }
  if (/(sec|cftc|regulation|lawsuit|approval|etf)/.test(value)) {
    return "regulation";
  }
  return "risk";
}

function eventNote(area: MarketImpactArea): string {
  switch (area) {
    case "rates":
      return "Rate events can reset risk appetite. Wait for spread, wick, and volume behavior to calm down.";
    case "inflation":
      return "Inflation releases can move yields and the dollar. Treat the first candle as information, not proof.";
    case "labor":
      return "Jobs data can change rate expectations. Watch whether the move holds after the first reaction.";
    case "growth":
      return "Growth data can shift broad market risk appetite. Compare the headline reaction with your key levels.";
    case "liquidity":
      return "Liquidity events can change market speed. Stops may need more room, or the setup may need to wait.";
    case "regulation":
      return "Regulatory headlines can hit crypto and single names fast. Wait for chart confirmation after the headline.";
    case "risk":
      return "Use this as context only. A plan still needs trend, location, invalidation, and risk math.";
  }
}

function headlineNote(area: MarketImpactArea): string {
  switch (area) {
    case "rates":
    case "inflation":
    case "labor":
    case "growth":
      return "Macro headline: expect possible broad-market volatility before trusting a clean setup.";
    case "regulation":
      return "Regulation or ETF headline: useful context, but the chart still has to prove the idea.";
    case "liquidity":
      return "Liquidity headline: watch spread, wick size, and whether levels still behave normally.";
    case "risk":
      return "Risk headline: read it as background pressure, not as a trade signal.";
  }
}

function hasHighImpactTerm(title: string, category: string): boolean {
  const text = `${title} ${category}`.toLowerCase();
  return HIGH_IMPACT_TERMS.some((term) => text.includes(term));
}

function importanceScore(value: MarketImpactImportance): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeTradingEconomicsUrl(value: string | null | undefined): string | null {
  const cleaned = cleanValue(value);
  if (!cleaned) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://tradingeconomics.com${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
}

function cleanValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null") return null;
  return text;
}

function isCryptoPair(pair: string): boolean {
  return /\/USD$/.test(pair) && !["SPY/USD", "NVDA/USD", "AAPL/USD"].includes(pair);
}

function dateMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
