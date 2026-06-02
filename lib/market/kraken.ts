export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketSnapshot = {
  source: "kraken_public_ohlc";
  pair: string;
  krakenPair: string;
  intervalMinutes: number;
  candleCount: number;
  lastClose: number;
  changePercent: number;
  support: number;
  resistance: number;
  sma20: number | null;
  sma50: number | null;
  trendLabel: "uptrend" | "downtrend" | "sideways";
  rangePosition: "near support" | "middle of range" | "near resistance";
  generatedAt: string;
};

export type KrakenHistoricalCandles = {
  source: "kraken_public_ohlc";
  pair: string;
  krakenPair: string;
  intervalMinutes: number;
  candles: Candle[];
  generatedAt: string;
};

const INTERVALS: Record<string, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "1H": 60,
  "4h": 240,
  "4H": 240,
  "1d": 1440,
  "1D": 1440,
  daily: 1440,
  "1w": 10080,
  "1W": 10080,
  weekly: 10080,
};

type KrakenOhlcResponse = {
  error?: string[];
  result?: Record<string, unknown>;
};

export function intervalToMinutes(timeframe?: string): number {
  if (!timeframe) return 240;
  return INTERVALS[timeframe.trim()] ?? 240;
}

export function normalizeKrakenPair(pair: string): string {
  const compact = pair.trim().replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!compact) return "XBTUSD";
  return compact.replace(/^BTC/, "XBT");
}

export async function getKrakenMarketSnapshot({
  pair,
  timeframe,
}: {
  pair: string;
  timeframe?: string;
}): Promise<MarketSnapshot> {
  const historical = await getKrakenHistoricalCandles({ pair, timeframe, limit: 120 });
  return summarizeCandles({
    pair: historical.pair,
    krakenPair: historical.krakenPair,
    intervalMinutes: historical.intervalMinutes,
    candles: historical.candles,
  });
}

export async function getKrakenHistoricalCandles({
  pair,
  timeframe,
  limit = 240,
}: {
  pair: string;
  timeframe?: string;
  limit?: number;
}): Promise<KrakenHistoricalCandles> {
  const intervalMinutes = intervalToMinutes(timeframe);
  const krakenPair = normalizeKrakenPair(pair);
  const url = new URL("https://api.kraken.com/0/public/OHLC");
  url.searchParams.set("pair", krakenPair);
  url.searchParams.set("interval", String(intervalMinutes));

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Kraken OHLC request failed: ${res.status}`);
  }

  const data = (await res.json()) as KrakenOhlcResponse;
  if (data.error?.length) {
    throw new Error(`Kraken OHLC error: ${data.error.join(", ")}`);
  }

  const entries = Object.entries(data.result ?? {}).filter(([key]) => key !== "last");
  const rawCandles = entries[0]?.[1];
  if (!Array.isArray(rawCandles)) {
    throw new Error("Kraken OHLC response did not include candles");
  }

  const candles = rawCandles
    .map(parseCandle)
    .filter((candle): candle is Candle => !!candle);
  if (candles.length < 20) {
    throw new Error("Not enough candles returned for a useful snapshot");
  }

  // Kraken includes the current not-yet-committed candle as the last row.
  const committed = candles.length > 25 ? candles.slice(0, -1) : candles;
  return {
    source: "kraken_public_ohlc",
    pair,
    krakenPair,
    intervalMinutes,
    candles: committed.slice(-limit),
    generatedAt: new Date().toISOString(),
  };
}

function parseCandle(row: unknown): Candle | null {
  if (!Array.isArray(row) || row.length < 8) return null;
  const candle = {
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[6]),
  };
  return Object.values(candle).every(Number.isFinite) ? candle : null;
}

function summarizeCandles({
  pair,
  krakenPair,
  intervalMinutes,
  candles,
}: {
  pair: string;
  krakenPair: string;
  intervalMinutes: number;
  candles: Candle[];
}): MarketSnapshot {
  const last = candles[candles.length - 1];
  const first = candles[0];
  const support = Math.min(...candles.slice(-60).map((candle) => candle.low));
  const resistance = Math.max(...candles.slice(-60).map((candle) => candle.high));
  const sma20 = simpleMovingAverage(candles, 20);
  const sma50 = simpleMovingAverage(candles, 50);
  const rangeWidth = Math.max(resistance - support, Number.EPSILON);
  const rangePercent = (last.close - support) / rangeWidth;
  const changePercent = ((last.close - first.open) / first.open) * 100;

  return {
    source: "kraken_public_ohlc",
    pair,
    krakenPair,
    intervalMinutes,
    candleCount: candles.length,
    lastClose: round(last.close),
    changePercent: round(changePercent),
    support: round(support),
    resistance: round(resistance),
    sma20: sma20 === null ? null : round(sma20),
    sma50: sma50 === null ? null : round(sma50),
    trendLabel: trendLabel({ lastClose: last.close, sma20, sma50, changePercent }),
    rangePosition:
      rangePercent <= 0.25
        ? "near support"
        : rangePercent >= 0.75
        ? "near resistance"
        : "middle of range",
    generatedAt: new Date().toISOString(),
  };
}

function simpleMovingAverage(candles: Candle[], length: number): number | null {
  if (candles.length < length) return null;
  const slice = candles.slice(-length);
  return slice.reduce((sum, candle) => sum + candle.close, 0) / length;
}

function trendLabel({
  lastClose,
  sma20,
  sma50,
  changePercent,
}: {
  lastClose: number;
  sma20: number | null;
  sma50: number | null;
  changePercent: number;
}): MarketSnapshot["trendLabel"] {
  if (sma20 !== null && sma50 !== null) {
    if (lastClose > sma20 && sma20 > sma50) return "uptrend";
    if (lastClose < sma20 && sma20 < sma50) return "downtrend";
  }
  if (changePercent > 2) return "uptrend";
  if (changePercent < -2) return "downtrend";
  return "sideways";
}

function round(value: number): number {
  if (Math.abs(value) >= 100) return Number(value.toFixed(2));
  if (Math.abs(value) >= 1) return Number(value.toFixed(4));
  return Number(value.toFixed(8));
}
