export type AssetType =
  | "crypto"
  | "stock"
  | "etf"
  | "forex"
  | "futures"
  | "unknown";

export type SourceLink = {
  label: string;
  url: string;
  description: string;
  category:
    | "chart"
    | "market_data"
    | "official"
    | "filings"
    | "news"
    | "education";
};

export type SourceLinkInput = {
  assetTicker: string;
  assetType?: AssetType;
  assetName?: string;
  exchange?: string;
};

const FIAT_CODES = new Set([
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
]);

const CRYPTO_QUOTES = new Set(["USD", "USDT", "USDC", "BTC", "ETH"]);

function normalizeTicker(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  const removedUnsafe = trimmed.replace(/[^A-Z0-9/\-.:\s]/g, "");
  return removedUnsafe.replace(/\s+/g, "");
}

function encode(v: string): string {
  return encodeURIComponent(v);
}

function inferAssetType(ticker: string): AssetType {
  if (!ticker) return "unknown";

  if (ticker.includes("/")) {
    const [base, quote] = ticker.split("/");
    if (base && quote && base.length === 3 && quote.length === 3) {
      if (FIAT_CODES.has(base) && FIAT_CODES.has(quote)) return "forex";
    }
    if (quote && CRYPTO_QUOTES.has(quote)) return "crypto";
  }

  if (/^[A-Z]{1,5}$/.test(ticker)) return "stock";
  if (/^[A-Z]{1,4}[0-9]{1,2}$/.test(ticker)) return "futures";
  if (/^[A-Z0-9]{3,}(USD|USDT|USDC)$/.test(ticker)) return "crypto";

  return "unknown";
}

function uniqueByUrl(links: SourceLink[]): SourceLink[] {
  const seen = new Set<string>();
  const out: SourceLink[] = [];
  for (const link of links) {
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    out.push(link);
  }
  return out;
}

export function buildSourceLinks(input: SourceLinkInput): SourceLink[] {
  const ticker = normalizeTicker(input.assetTicker);
  if (!ticker) return [];

  const resolvedType: AssetType =
    input.assetType && input.assetType !== "unknown"
      ? input.assetType
      : inferAssetType(ticker);

  const query = encode(ticker);
  const links: SourceLink[] = [
    {
      label: "TradingView",
      url: `https://www.tradingview.com/search/?query=${query}`,
      description: "Chart and symbol search for context validation.",
      category: "chart",
    },
  ];

  if (resolvedType === "crypto") {
    const symbol = encode(ticker.split("/")[0] || ticker);
    links.push(
      {
        label: "CoinGecko",
        url: `https://www.coingecko.com/en/search?query=${symbol}`,
        description: "Crypto market pages and reference data.",
        category: "market_data",
      },
      {
        label: "CoinMarketCap",
        url: `https://coinmarketcap.com/search/?q=${symbol}`,
        description: "Crypto market pages and listing references.",
        category: "market_data",
      }
    );
  }

  if (resolvedType === "stock" || resolvedType === "etf") {
    const pathTicker = encode((ticker.split(/[/:.-]/)[0] || ticker).toLowerCase());
    links.push({
      label: "Nasdaq",
      url:
        resolvedType === "etf"
          ? `https://www.nasdaq.com/market-activity/etf/${pathTicker}`
          : `https://www.nasdaq.com/market-activity/stocks/${pathTicker}`,
      description:
        resolvedType === "etf"
          ? "ETF quote and market activity page."
          : "Stock quote and market activity page.",
      category: "official",
    });
    links.push({
      label: "SEC EDGAR",
      url: `https://www.sec.gov/edgar/search/#/q=${encode(ticker)}`,
      description: "Official U.S. filings and disclosure search.",
      category: "filings",
    });
  }

  return uniqueByUrl(links);
}
