import type { Candle } from "@/lib/market/kraken";

export type TrendDirection = "up" | "down" | "neutral";

export type SupportResistanceRead = {
  support: number | null;
  resistance: number | null;
};

export type StructureLocation =
  | "near-support"
  | "near-resistance"
  | "middle"
  | "unknown";

export type IndicatorPoint = {
  time: number;
  value: number;
};

export type TechnicalIndicatorSeries = {
  ema20: IndicatorPoint[];
  ema50: IndicatorPoint[];
  rsi14: IndicatorPoint[];
  atr14: IndicatorPoint[];
  volumeSma20: IndicatorPoint[];
};

export type TechnicalIndicatorRead = {
  close: number | null;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  atr14: number | null;
  volume: number | null;
  relativeVolume20: number | null;
  trend: {
    label: string;
    explanation: string;
  };
  momentum: {
    label: string;
    explanation: string;
  };
  volatility: {
    label: string;
    explanation: string;
  };
  participation: {
    label: string;
    explanation: string;
  };
  summary: string;
  planQuestion: string;
};

export function findSupportResistance(
  candles: Candle[],
  lookback = 40
): SupportResistanceRead {
  const recent = candles.slice(-Math.max(2, lookback));
  if (recent.length < 2) return { support: null, resistance: null };

  return {
    support: Math.min(...recent.map((candle) => candle.low)),
    resistance: Math.max(...recent.map((candle) => candle.high)),
  };
}

export function detectTrend(candles: Candle[], lookback = 8): TrendDirection {
  const recent = candles.slice(-Math.max(3, lookback));
  if (recent.length < 3) return "neutral";

  const closes = recent.map((candle) => candle.close);
  const first = closes[0];
  const last = closes.at(-1);
  if (typeof first !== "number" || typeof last !== "number") return "neutral";

  const upSteps = closes
    .slice(1)
    .filter((close, index) => close > closes[index]).length;
  const downSteps = closes
    .slice(1)
    .filter((close, index) => close < closes[index]).length;

  if (last > first && upSteps >= downSteps + 2) return "up";
  if (last < first && downSteps >= upSteps + 2) return "down";
  return "neutral";
}

export function locatePriceInStructure({
  price,
  support,
  resistance,
}: {
  price: number | null | undefined;
  support: number | null;
  resistance: number | null;
}): StructureLocation {
  if (
    typeof price !== "number" ||
    support === null ||
    resistance === null ||
    resistance <= support
  ) {
    return "unknown";
  }

  const position = (price - support) / (resistance - support);
  if (position <= 0.25) return "near-support";
  if (position >= 0.75) return "near-resistance";
  return "middle";
}

export function calculateSMA(
  candles: Candle[],
  period: number,
  valueKey: keyof Pick<Candle, "open" | "high" | "low" | "close" | "volume"> = "close"
): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];

  const result: IndicatorPoint[] = [];
  let rolling = 0;
  candles.forEach((candle, index) => {
    rolling += candle[valueKey];
    if (index >= period) {
      rolling -= candles[index - period][valueKey];
    }
    if (index >= period - 1) {
      result.push({
        time: candle.time,
        value: rolling / period,
      });
    }
  });

  return result;
}

export function calculateEMA(
  candles: Candle[],
  period: number,
  valueKey: keyof Pick<Candle, "open" | "high" | "low" | "close"> = "close"
): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];

  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);
  let ema =
    candles.slice(0, period).reduce((sum, candle) => sum + candle[valueKey], 0) /
    period;

  result.push({ time: candles[period - 1].time, value: ema });

  for (let index = period; index < candles.length; index += 1) {
    const price = candles[index][valueKey];
    ema = (price - ema) * multiplier + ema;
    result.push({ time: candles[index].time, value: ema });
  }

  return result;
}

export function calculateRSI(
  candles: Candle[],
  period = 14,
  valueKey: keyof Pick<Candle, "open" | "high" | "low" | "close"> = "close"
): IndicatorPoint[] {
  if (period <= 0 || candles.length < period + 1) return [];

  const result: IndicatorPoint[] = [];
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = candles[index][valueKey] - candles[index - 1][valueKey];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  result.push({
    time: candles[period].time,
    value: rsiFromAverages(averageGain, averageLoss),
  });

  for (let index = period + 1; index < candles.length; index += 1) {
    const change = candles[index][valueKey] - candles[index - 1][valueKey];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    result.push({
      time: candles[index].time,
      value: rsiFromAverages(averageGain, averageLoss),
    });
  }

  return result;
}

export function calculateATR(candles: Candle[], period = 14): IndicatorPoint[] {
  if (period <= 0 || candles.length < period + 1) return [];

  const trueRanges: Array<{ time: number; value: number }> = [];
  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];
    trueRanges.push({
      time: candle.time,
      value: Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previous.close),
        Math.abs(candle.low - previous.close)
      ),
    });
  }

  const result: IndicatorPoint[] = [];
  let atr =
    trueRanges.slice(0, period).reduce((sum, item) => sum + item.value, 0) /
    period;
  result.push({ time: trueRanges[period - 1].time, value: atr });

  for (let index = period; index < trueRanges.length; index += 1) {
    atr = (atr * (period - 1) + trueRanges[index].value) / period;
    result.push({ time: trueRanges[index].time, value: atr });
  }

  return result;
}

export function buildTechnicalIndicatorSeries(
  candles: Candle[]
): TechnicalIndicatorSeries {
  return {
    ema20: calculateEMA(candles, 20),
    ema50: calculateEMA(candles, 50),
    rsi14: calculateRSI(candles, 14),
    atr14: calculateATR(candles, 14),
    volumeSma20: calculateSMA(candles, 20, "volume"),
  };
}

export function buildTechnicalIndicatorRead(
  candles: Candle[]
): TechnicalIndicatorRead {
  const last = candles.at(-1) ?? null;
  const series = buildTechnicalIndicatorSeries(candles);
  const close = last?.close ?? null;
  const ema20 = lastValue(series.ema20);
  const ema50 = lastValue(series.ema50);
  const rsi14 = lastValue(series.rsi14);
  const atr14 = lastValue(series.atr14);
  const volume = last?.volume ?? null;
  const volumeSma20 = lastValue(series.volumeSma20);
  const relativeVolume20 =
    volume !== null && volumeSma20 !== null && volumeSma20 > 0
      ? volume / volumeSma20
      : null;

  const trend = readTrend({ close, ema20, ema50 });
  const momentum = readMomentum(rsi14);
  const volatility = readVolatility({ close, atr14 });
  const participation = readParticipation(relativeVolume20);

  return {
    close,
    ema20,
    ema50,
    rsi14,
    atr14,
    volume,
    relativeVolume20,
    trend,
    momentum,
    volatility,
    participation,
    summary: `Trend: ${trend.label}. Momentum: ${momentum.label}. Volatility: ${volatility.label}. Participation: ${participation.label}.`,
    planQuestion:
      "Does price location agree with these indicator clues, or are the indicators fighting the level?",
  };
}

function rsiFromAverages(averageGain: number, averageLoss: number): number {
  if (averageLoss === 0 && averageGain === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}

function lastValue(points: IndicatorPoint[]): number | null {
  const value = points.at(-1)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readTrend({
  close,
  ema20,
  ema50,
}: {
  close: number | null;
  ema20: number | null;
  ema50: number | null;
}): TechnicalIndicatorRead["trend"] {
  if (close === null || ema20 === null || ema50 === null) {
    return {
      label: "not enough EMA history",
      explanation: "EMA trend needs enough candles before it is meaningful.",
    };
  }

  if (close > ema20 && ema20 > ema50) {
    return {
      label: "bullish EMA stack",
      explanation:
        "Price is above the 20 EMA, and the 20 EMA is above the 50 EMA. Trend context is leaning up, but location still matters.",
    };
  }

  if (close < ema20 && ema20 < ema50) {
    return {
      label: "bearish EMA stack",
      explanation:
        "Price is below the 20 EMA, and the 20 EMA is below the 50 EMA. Trend context is leaning down, but a late chase can still be poor.",
    };
  }

  return {
    label: "mixed EMA structure",
    explanation:
      "Price and moving averages are not cleanly stacked. This usually means transition, chop, or a setup that needs more proof.",
  };
}

function readMomentum(rsi14: number | null): TechnicalIndicatorRead["momentum"] {
  if (rsi14 === null) {
    return {
      label: "not enough RSI history",
      explanation: "RSI needs enough candles before it can describe momentum.",
    };
  }

  if (rsi14 >= 70) {
    return {
      label: "stretched high RSI",
      explanation:
        "RSI is above 70. Momentum is strong or stretched; this is not an automatic short.",
    };
  }
  if (rsi14 <= 30) {
    return {
      label: "stretched low RSI",
      explanation:
        "RSI is below 30. Momentum is weak or stretched; this is not an automatic long.",
    };
  }
  if (rsi14 >= 55) {
    return {
      label: "positive momentum",
      explanation:
        "RSI is above the middle zone, so buyers have some momentum advantage.",
    };
  }
  if (rsi14 <= 45) {
    return {
      label: "negative momentum",
      explanation:
        "RSI is below the middle zone, so sellers have some momentum advantage.",
    };
  }
  return {
    label: "balanced momentum",
    explanation:
      "RSI is near the middle. Momentum is not giving a strong edge by itself.",
  };
}

function readVolatility({
  close,
  atr14,
}: {
  close: number | null;
  atr14: number | null;
}): TechnicalIndicatorRead["volatility"] {
  if (close === null || atr14 === null || close === 0) {
    return {
      label: "not enough ATR history",
      explanation: "ATR needs enough candles before it can estimate normal movement.",
    };
  }

  const atrPercent = (atr14 / close) * 100;
  if (atrPercent >= 3) {
    return {
      label: "wide movement",
      explanation:
        "ATR is large relative to price. Tight invalidation lines are more likely to be noise.",
    };
  }
  if (atrPercent <= 0.75) {
    return {
      label: "compressed movement",
      explanation:
        "ATR is small relative to price. A larger move may still need a trigger before assuming expansion.",
    };
  }
  return {
    label: "normal movement",
    explanation:
      "ATR is moderate relative to price. Use it as a rough room-to-breathe check, not direction.",
  };
}

function readParticipation(
  relativeVolume20: number | null
): TechnicalIndicatorRead["participation"] {
  if (relativeVolume20 === null) {
    return {
      label: "not enough volume history",
      explanation: "Relative volume needs enough candles before it can compare participation.",
    };
  }
  if (relativeVolume20 >= 1.5) {
    return {
      label: "volume expanding",
      explanation:
        "Current volume is well above its 20-candle average. More participation showed up on this candle.",
    };
  }
  if (relativeVolume20 <= 0.7) {
    return {
      label: "light volume",
      explanation:
        "Current volume is below its 20-candle average. The move may need more participation to trust.",
    };
  }
  return {
    label: "average volume",
    explanation:
      "Current volume is close to its 20-candle average. Participation is not unusual by itself.",
  };
}
