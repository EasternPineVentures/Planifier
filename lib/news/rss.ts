export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  matchedTerms: string[];
};

export type NewsSnapshot = {
  generatedAt: string;
  queryTerms: string[];
  articles: NewsArticle[];
  sourceNotes: string[];
};

export type HeadlineAssetType = "crypto" | "stocks_etfs" | "macro";

export type HeadlineTapeItem = NewsArticle & {
  assetType: HeadlineAssetType;
  assetLabel: string;
};

export type HeadlineTapeGroup = {
  assetType: HeadlineAssetType;
  label: string;
  items: HeadlineTapeItem[];
};

export type HeadlineTapeSnapshot = {
  generatedAt: string;
  groups: HeadlineTapeGroup[];
  sourceNotes: string[];
};

type FeedSource = {
  name: string;
  url: string;
  assetType?: HeadlineAssetType;
  label?: string;
};

const FEEDS: FeedSource[] = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss",
  },
  {
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
  },
];

const HEADLINE_FEEDS: Required<FeedSource>[] = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss",
    assetType: "crypto",
    label: "Crypto",
  },
  {
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    assetType: "crypto",
    label: "Crypto",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    assetType: "stocks_etfs",
    label: "Stocks & ETFs",
  },
  {
    name: "MarketWatch MarketPulse",
    url: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse",
    assetType: "stocks_etfs",
    label: "Stocks & ETFs",
  },
  {
    name: "CNBC Markets",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    assetType: "macro",
    label: "Macro",
  },
];

const HEADLINE_GROUP_ORDER: Array<{
  assetType: HeadlineAssetType;
  label: string;
}> = [
  { assetType: "crypto", label: "Crypto" },
  { assetType: "stocks_etfs", label: "Stocks & ETFs" },
  { assetType: "macro", label: "Macro" },
];

const ASSET_TERMS: Record<string, string[]> = {
  BTC: ["BTC", "Bitcoin", "XBT"],
  XBT: ["BTC", "Bitcoin", "XBT"],
  ETH: ["ETH", "Ether", "Ethereum"],
  SOL: ["SOL", "Solana"],
  XRP: ["XRP", "Ripple"],
  DOGE: ["DOGE", "Dogecoin"],
  USDT: ["USDT", "Tether", "stablecoin"],
  USDC: ["USDC", "Circle", "stablecoin"],
  BNB: ["BNB", "Binance"],
  HYPE: ["HYPE", "Hyperliquid"],
  SUI: ["SUI"],
};

const MARKET_CONTEXT_TERMS = [
  "crypto",
  "ETF",
  "SEC",
  "CFTC",
  "Fed",
  "stablecoin",
  "liquidity",
  "rates",
  "regulation",
];

const FEED_TIMEOUT_MS = 8000;

export async function getCurrentNewsSnapshot(pair: string): Promise<NewsSnapshot> {
  const queryTerms = buildNewsTerms(pair);
  const settled = await Promise.allSettled(
    FEEDS.map(async (feed) => ({
      feed,
      items: parseRssItems(await fetchFeed(feed)),
    }))
  );

  const sourceNotes: string[] = [];
  const articles = settled.flatMap((result) => {
    if (result.status === "rejected") {
      sourceNotes.push(`News source unavailable: ${result.reason}`);
      return [];
    }

    sourceNotes.push(`${result.value.feed.name} RSS checked`);
    return result.value.items
      .map((item) => ({
        ...item,
        source: result.value.feed.name,
        matchedTerms: matchedTerms(item, queryTerms),
      }))
      .filter((item) => item.matchedTerms.length > 0);
  });

  const deduped = dedupeArticles(articles)
    .sort((a, b) => dateMs(b.publishedAt) - dateMs(a.publishedAt))
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    queryTerms,
    articles: deduped,
    sourceNotes,
  };
}

export async function getHeadlineTapeSnapshot(): Promise<HeadlineTapeSnapshot> {
  const settled = await Promise.allSettled(
    HEADLINE_FEEDS.map(async (feed) => ({
      feed,
      items: parseRssItems(await fetchFeed(feed)),
    }))
  );

  const sourceNotes: string[] = [];
  const articles = settled.flatMap((result) => {
    if (result.status === "rejected") {
      sourceNotes.push(`Headline source unavailable: ${result.reason}`);
      return [];
    }

    sourceNotes.push(`${result.value.feed.name} RSS checked`);
    return result.value.items.map((item) => ({
      ...item,
      source: result.value.feed.name,
      matchedTerms: [],
      assetType: result.value.feed.assetType,
      assetLabel: result.value.feed.label,
    }));
  });

  return {
    generatedAt: new Date().toISOString(),
    groups: buildHeadlineTapeGroups(articles),
    sourceNotes,
  };
}

export function buildHeadlineTapeGroups(
  articles: HeadlineTapeItem[],
  perGroup = 6
): HeadlineTapeGroup[] {
  return HEADLINE_GROUP_ORDER.map((group) => {
    const items = dedupeArticles(
      articles.filter((article) => article.assetType === group.assetType)
    )
      .sort((a, b) => dateMs(b.publishedAt) - dateMs(a.publishedAt))
      .slice(0, perGroup);

    return {
      ...group,
      items,
    };
  });
}

export function buildNewsTerms(pair: string): string[] {
  const base = pair
    .replace(/[^a-z0-9/]/gi, "")
    .toUpperCase()
    .split("/")
    .filter(Boolean)[0];
  const assetTerms = ASSET_TERMS[base] ?? [base];
  return Array.from(new Set([...assetTerms, ...MARKET_CONTEXT_TERMS]));
}

export function parseRssItems(xml: string): Array<Omit<NewsArticle, "source" | "matchedTerms">> {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi))
    .map((match) => parseRssItem(match[0]))
    .filter((item): item is Omit<NewsArticle, "source" | "matchedTerms"> => !!item);
}

async function fetchFeed(feed: FeedSource): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "Planifier/0.1 educational market context",
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      throw new Error(`${feed.name} HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRssItem(
  itemXml: string
): Omit<NewsArticle, "source" | "matchedTerms"> | null {
  const title = extractTag(itemXml, "title");
  const url = extractTag(itemXml, "link") ?? extractGuidUrl(itemXml);
  if (!title || !url) return null;

  return {
    title,
    url,
    publishedAt: extractTag(itemXml, "pubDate") ?? extractTag(itemXml, "dc:date"),
  };
}

function extractTag(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(stripCdata(match[1]).trim()) : null;
}

function extractGuidUrl(xml: string): string | null {
  const guid = extractTag(xml, "guid");
  return guid && /^https?:\/\//i.test(guid) ? guid : null;
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeXml(value: string): string {
  return repairMojibake(
    value
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
        safeCodePoint(Number.parseInt(hex, 16))
      )
      .replace(/&#([0-9]+);/g, (_match, code: string) =>
        safeCodePoint(Number.parseInt(code, 10))
      )
  );
}

function safeCodePoint(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
}

function repairMojibake(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, '"')
    .replace(/\u00e2\u20ac\u009d/g, '"')
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00c2\u00a0/g, " ")
    .replace(/\u00c2/g, "");
}

function matchedTerms(
  item: Omit<NewsArticle, "source" | "matchedTerms">,
  terms: string[]
): string[] {
  const haystack = `${item.title} ${item.url}`.toLowerCase();
  return terms.filter((term) => haystack.includes(term.toLowerCase()));
}

function dedupeArticles<T extends NewsArticle>(articles: T[]): T[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.url.replace(/\?.*$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dateMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
