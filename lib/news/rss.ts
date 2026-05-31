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

type FeedSource = {
  name: string;
  url: string;
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
  const res = await fetch(feed.url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "Planifier/0.1 educational market context",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`${feed.name} HTTP ${res.status}`);
  }
  return res.text();
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
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function matchedTerms(
  item: Omit<NewsArticle, "source" | "matchedTerms">,
  terms: string[]
): string[] {
  const haystack = `${item.title} ${item.url}`.toLowerCase();
  return terms.filter((term) => haystack.includes(term.toLowerCase()));
}

function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
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
