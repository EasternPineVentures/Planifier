import type { Candle, KrakenHistoricalCandles } from "@/lib/market/kraken";

export const LEARNING_CHART_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type LearningChartTimeframe = (typeof LEARNING_CHART_TIMEFRAMES)[number];

export type LearningChartPair = {
  symbol: string;
  label: string;
  krakenPair: string;
};

export const LEARNING_CHART_PAIRS: LearningChartPair[] = [
  { symbol: "BTC/USD", label: "Bitcoin / US Dollar", krakenPair: "XBTUSD" },
  { symbol: "ETH/USD", label: "Ethereum / US Dollar", krakenPair: "ETHUSD" },
  { symbol: "SOL/USD", label: "Solana / US Dollar", krakenPair: "SOLUSD" },
  { symbol: "XRP/USD", label: "XRP / US Dollar", krakenPair: "XRPUSD" },
  { symbol: "ADA/USD", label: "Cardano / US Dollar", krakenPair: "ADAUSD" },
  { symbol: "DOGE/USD", label: "Dogecoin / US Dollar", krakenPair: "XDGUSD" },
  { symbol: "DOT/USD", label: "Polkadot / US Dollar", krakenPair: "DOTUSD" },
  { symbol: "LTC/USD", label: "Litecoin / US Dollar", krakenPair: "LTCUSD" },
  { symbol: "LINK/USD", label: "Chainlink / US Dollar", krakenPair: "LINKUSD" },
];

export const DEFAULT_LEARNING_PAIR = LEARNING_CHART_PAIRS[0];
export const DEFAULT_LEARNING_TIMEFRAME: LearningChartTimeframe = "4h";

export type LearningOhlcPayload = {
  source: "kraken_public_ohlc";
  pair: string;
  krakenPair: string;
  timeframe: LearningChartTimeframe;
  intervalMinutes: number;
  generatedAt: string;
  candles: Candle[];
  attribution: {
    label: "TradingView Lightweight Charts";
    url: "https://www.tradingview.com/";
  };
  educationalOnly: true;
};

export type PracticeLevels = {
  entry: number | null;
  stop: number | null;
  target: number | null;
};

export type RiskRewardReadout = {
  status: "incomplete" | "invalid" | "valid";
  direction: "long" | "short" | null;
  risk: number | null;
  reward: number | null;
  ratio: number | null;
  label: string;
  explanation: string;
};

export type CandleExplanation = {
  direction: "green" | "red" | "flat";
  headline: string;
  bodyRead: string;
  wickRead: string;
  volumeRead: string;
  beginnerSteps: string[];
};

export function normalizeLearningChartTimeframe(
  timeframe?: string | null
): LearningChartTimeframe {
  const normalized = timeframe?.trim().toLowerCase();
  if (
    normalized &&
    LEARNING_CHART_TIMEFRAMES.includes(normalized as LearningChartTimeframe)
  ) {
    return normalized as LearningChartTimeframe;
  }
  return DEFAULT_LEARNING_TIMEFRAME;
}

export function findLearningChartPair(symbol?: string | null): LearningChartPair | null {
  const normalized = normalizePairLabel(symbol);
  return (
    LEARNING_CHART_PAIRS.find((pair) => normalizePairLabel(pair.symbol) === normalized) ??
    null
  );
}

export function buildLearningOhlcPayload({
  historical,
  timeframe,
}: {
  historical: KrakenHistoricalCandles;
  timeframe: LearningChartTimeframe;
}): LearningOhlcPayload {
  return {
    source: historical.source,
    pair: historical.pair,
    krakenPair: historical.krakenPair,
    timeframe,
    intervalMinutes: historical.intervalMinutes,
    generatedAt: historical.generatedAt,
    candles: historical.candles,
    attribution: {
      label: "TradingView Lightweight Charts",
      url: "https://www.tradingview.com/",
    },
    educationalOnly: true,
  };
}

export function calculateRiskReward(levels: PracticeLevels): RiskRewardReadout {
  const { entry, stop, target } = levels;
  if (!isFiniteLevel(entry) || !isFiniteLevel(stop) || !isFiniteLevel(target)) {
    return {
      status: "incomplete",
      direction: null,
      risk: null,
      reward: null,
      ratio: null,
      label: "Set levels",
      explanation:
        "Enter an entry, stop loss, and target to calculate the practice R/R.",
    };
  }

  const direction = target > entry ? "long" : target < entry ? "short" : null;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);

  if (!direction || risk === 0 || reward === 0) {
    return {
      status: "invalid",
      direction,
      risk,
      reward,
      ratio: null,
      label: "Check levels",
      explanation:
        "Entry, stop, and target need space between them before R/R means anything.",
    };
  }

  const stopOnCorrectSide =
    direction === "long" ? stop < entry : stop > entry;
  if (!stopOnCorrectSide) {
    return {
      status: "invalid",
      direction,
      risk,
      reward,
      ratio: null,
      label: "Stop side",
      explanation:
        direction === "long"
          ? "For a long practice map, the stop usually belongs below entry."
          : "For a short practice map, the stop usually belongs above entry.",
    };
  }

  const ratio = reward / risk;
  return {
    status: "valid",
    direction,
    risk: round(risk),
    reward: round(reward),
    ratio: round(ratio),
    label: `${ratio.toFixed(2)}R`,
    explanation: `Risk is about ${formatPrice(risk)} and reward is about ${formatPrice(
      reward
    )}. That makes this a ${ratio.toFixed(2)}R ${direction} practice map.`,
  };
}

export function explainLearningCandle(
  candle: Candle,
  previous?: Candle | null
): CandleExplanation {
  const range = Math.max(candle.high - candle.low, Number.EPSILON);
  const body = Math.abs(candle.close - candle.open);
  const bodyPercent = body / range;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const direction =
    candle.close > candle.open ? "green" : candle.close < candle.open ? "red" : "flat";

  const headline =
    direction === "green"
      ? `This candle closed higher than it opened at ${formatPrice(candle.close)}.`
      : direction === "red"
      ? `This candle closed lower than it opened at ${formatPrice(candle.close)}.`
      : `This candle opened and closed in almost the same place near ${formatPrice(
          candle.close
        )}.`;

  const bodyRead =
    bodyPercent >= 0.65
      ? "The body is large, so one side controlled most of this candle."
      : bodyPercent <= 0.25
      ? "The body is small, so neither side held much control by the close."
      : "The body is medium sized, so the candle shows pressure but not total control.";

  const wickRead =
    upperWick > lowerWick * 1.35
      ? "The upper wick is bigger, which means price tried higher and got pushed back."
      : lowerWick > upperWick * 1.35
      ? "The lower wick is bigger, which means price tried lower and got bought back up."
      : "The wicks are fairly balanced, so the candle does not show a sharp rejection.";

  const priorRead = previous
    ? candle.close > previous.close
      ? "It closed above the previous candle close, so short-term pressure improved."
      : candle.close < previous.close
      ? "It closed below the previous candle close, so short-term pressure weakened."
      : "It closed near the previous candle close, so momentum did not change much."
    : "Use the candles before it to compare whether pressure is improving or fading.";

  return {
    direction,
    headline,
    bodyRead,
    wickRead,
    volumeRead: `Volume on this candle was ${formatCompact(candle.volume)}. Higher volume can make a level test more meaningful, but it still needs context.`,
    beginnerSteps: [
      "Start with the close: did price finish near the high, low, or middle?",
      "Compare the body to the wick: big body means follow-through, big wick means rejection.",
      priorRead,
      "Then ask where it happened: near support, resistance, or in the middle.",
    ],
  };
}

export function summarizeLatestPrice(candles: Candle[]): {
  last: Candle | null;
  previous: Candle | null;
  change: number;
  changePercent: number;
} {
  const last = candles.at(-1) ?? null;
  const previous = candles.at(-2) ?? null;
  if (!last || !previous) {
    return { last, previous, change: 0, changePercent: 0 };
  }
  const change = last.close - previous.close;
  return {
    last,
    previous,
    change: round(change),
    changePercent: previous.close === 0 ? 0 : round((change / previous.close) * 100),
  };
}

export function buildTradingViewChartUrl({
  symbol,
  timeframe,
  time,
}: {
  symbol: string;
  timeframe: LearningChartTimeframe;
  time?: number | null;
}): string {
  const url = new URL("https://www.tradingview.com/chart/");
  url.searchParams.set("symbol", toTradingViewSymbol(symbol));
  url.searchParams.set("interval", tradingViewIntervalForTimeframe(timeframe));
  if (typeof time === "number" && Number.isFinite(time)) {
    url.searchParams.set("time_from", String(Math.floor(time)));
  }
  return url.toString();
}

export function toTradingViewSymbol(symbol: string): string {
  const normalized = symbol.trim().replace(/\s+/g, "").toUpperCase();
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  return compact ? `KRAKEN:${compact}` : "KRAKEN:BTCUSD";
}

export function tradingViewIntervalForTimeframe(
  timeframe: LearningChartTimeframe
): string {
  const intervals: Record<LearningChartTimeframe, string> = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    "1d": "D",
  };
  return intervals[timeframe];
}

export function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(6);
}

function normalizePairLabel(symbol?: string | null): string {
  return (symbol ?? DEFAULT_LEARNING_PAIR.symbol)
    .trim()
    .replace("-", "/")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isFiniteLevel(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatCompact(value: number): string {
  return Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function round(value: number): number {
  if (Math.abs(value) >= 100) return Number(value.toFixed(2));
  if (Math.abs(value) >= 1) return Number(value.toFixed(4));
  return Number(value.toFixed(8));
}
