export type MarketPairGroupId =
  | "crypto"
  | "stocks"
  | "etfs"
  | "forex"
  | "metals";

export type MarketPairOption = {
  symbol: string;
  label: string;
  group: MarketPairGroupId;
  plainEnglish: string;
};

export type MarketPairGroup = {
  id: MarketPairGroupId;
  label: string;
  options: MarketPairOption[];
};

export const MARKET_PAIR_GROUPS: MarketPairGroup[] = [
  {
    id: "crypto",
    label: "Crypto",
    options: [
      {
        symbol: "BTC/USD",
        label: "Bitcoin",
        group: "crypto",
        plainEnglish: "A high-liquidity crypto chart for learning trend, pullbacks, and range behavior.",
      },
      {
        symbol: "ETH/USD",
        label: "Ethereum",
        group: "crypto",
        plainEnglish: "A major crypto chart that often moves with broad crypto risk appetite.",
      },
      {
        symbol: "SOL/USD",
        label: "Solana",
        group: "crypto",
        plainEnglish: "A faster-moving crypto chart for practicing patience around volatility.",
      },
      {
        symbol: "XRP/USD",
        label: "XRP",
        group: "crypto",
        plainEnglish: "A crypto chart that can be useful for studying range breaks and failed moves.",
      },
    ],
  },
  {
    id: "etfs",
    label: "ETFs",
    options: [
      {
        symbol: "SPY",
        label: "S&P 500 ETF",
        group: "etfs",
        plainEnglish: "A broad market chart for learning index trend and range structure.",
      },
      {
        symbol: "QQQ",
        label: "Nasdaq 100 ETF",
        group: "etfs",
        plainEnglish: "A tech-heavy market chart for practicing momentum and pullback reads.",
      },
      {
        symbol: "IWM",
        label: "Russell 2000 ETF",
        group: "etfs",
        plainEnglish: "A small-cap market chart that can help compare risk appetite.",
      },
    ],
  },
  {
    id: "stocks",
    label: "Stocks",
    options: [
      {
        symbol: "AAPL",
        label: "Apple",
        group: "stocks",
        plainEnglish: "A liquid stock chart for practicing levels, retests, and trend context.",
      },
      {
        symbol: "MSFT",
        label: "Microsoft",
        group: "stocks",
        plainEnglish: "A large-cap stock chart for studying orderly trends and pullbacks.",
      },
      {
        symbol: "NVDA",
        label: "NVIDIA",
        group: "stocks",
        plainEnglish: "A momentum stock chart for learning how strong trends can still need confirmation.",
      },
      {
        symbol: "TSLA",
        label: "Tesla",
        group: "stocks",
        plainEnglish: "A volatile stock chart for practicing invalidation and not chasing.",
      },
    ],
  },
  {
    id: "forex",
    label: "Forex",
    options: [
      {
        symbol: "EUR/USD",
        label: "Euro / US Dollar",
        group: "forex",
        plainEnglish: "A major currency pair for studying trend, range, and macro-sensitive movement.",
      },
      {
        symbol: "GBP/JPY",
        label: "British Pound / Japanese Yen",
        group: "forex",
        plainEnglish: "A more volatile currency pair for practicing clean levels and risk awareness.",
      },
      {
        symbol: "USD/JPY",
        label: "US Dollar / Japanese Yen",
        group: "forex",
        plainEnglish: "A major currency pair often used to study trend and support/resistance.",
      },
    ],
  },
  {
    id: "metals",
    label: "Metals",
    options: [
      {
        symbol: "GOLD",
        label: "Gold",
        group: "metals",
        plainEnglish: "A common safe-haven chart for practicing trend, retest, and news-aware context.",
      },
      {
        symbol: "SILVER",
        label: "Silver",
        group: "metals",
        plainEnglish: "A more volatile metals chart for learning how support can fail quickly.",
      },
    ],
  },
];

export const QUICK_START_PAIR_SYMBOLS = [
  "BTC/USD",
  "ETH/USD",
  "SPY",
  "NVDA",
] as const;

const MARKET_PAIR_LOOKUP = new Map(
  MARKET_PAIR_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.symbol, option])
  )
);

export function getMarketPairOption(symbol: string): MarketPairOption | null {
  const normalized = symbol.trim().toUpperCase();
  return MARKET_PAIR_LOOKUP.get(normalized) ?? null;
}

export function getAllMarketPairSymbols(): string[] {
  return MARKET_PAIR_GROUPS.flatMap((group) =>
    group.options.map((option) => option.symbol)
  );
}
