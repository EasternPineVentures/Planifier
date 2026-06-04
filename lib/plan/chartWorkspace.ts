export type ChartPatternId =
  | "slide-pressure"
  | "support-retest"
  | "breakout-retest"
  | "range-chop";

export type ChartLineId = "support" | "resistance" | "invalidation";

export type WorkspaceCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export type WorkspaceLevels = Record<ChartLineId, number>;

export type ChartWorkspaceFeedback = {
  trend: string;
  location: string;
  quality: string;
  nextCheck: string;
  invalidationRead: string;
  chartNote: string;
};

export const CHART_PATTERNS: Array<{
  id: ChartPatternId;
  label: string;
  plainEnglish: string;
}> = [
  {
    id: "slide-pressure",
    label: "Slide pressure",
    plainEnglish: "Lower highs with weak bounces. Good for learning how shorts can fail or confirm.",
  },
  {
    id: "support-retest",
    label: "Support retest",
    plainEnglish: "Pullback into a prior support area. Good for learning patience near a level.",
  },
  {
    id: "breakout-retest",
    label: "Breakout retest",
    plainEnglish: "Price broke a level and is checking whether it holds.",
  },
  {
    id: "range-chop",
    label: "Range chop",
    plainEnglish: "Price is boxed between support and resistance. Good for learning when to wait.",
  },
];

const CLOSE_TEMPLATES: Record<ChartPatternId, number[]> = {
  "slide-pressure": [
    103, 102, 101, 100.5, 101.2, 100.1, 99.4, 98.8, 99.3, 98.2, 97.5, 96.8,
    97.2, 96.1, 95.4, 94.8, 95.1, 94.2, 93.5, 92.9, 93.1, 92.4, 91.8, 91.2,
    91.6, 90.9, 90.4, 90.1,
  ],
  "support-retest": [
    88, 89.2, 90.4, 91.7, 92.9, 94.1, 95.2, 96.4, 95.6, 94.7, 93.9, 93.2,
    92.6, 92.9, 93.4, 94.2, 95.1, 96.0, 95.4, 94.8, 94.1, 93.6, 93.1, 92.8,
    93.0, 93.5, 94.0, 94.6,
  ],
  "breakout-retest": [
    87, 87.8, 88.3, 88.9, 89.2, 89.6, 90.1, 90.4, 90.2, 90.6, 91.1, 92.4,
    94.1, 95.7, 96.8, 97.4, 96.6, 95.9, 95.0, 94.4, 94.1, 94.6, 95.1, 95.8,
    96.2, 96.8, 97.1, 97.6,
  ],
  "range-chop": [
    95, 96.2, 97.3, 98.1, 97.5, 96.4, 95.1, 94.2, 93.8, 94.6, 95.9, 97.0,
    98.0, 97.2, 96.0, 94.9, 94.0, 94.4, 95.5, 96.8, 97.7, 97.1, 95.8, 94.7,
    94.2, 95.0, 96.1, 96.8,
  ],
};

export function buildPracticeCandles(pattern: ChartPatternId): WorkspaceCandle[] {
  const closes = CLOSE_TEMPLATES[pattern] ?? CLOSE_TEMPLATES["range-chop"];
  return closes.map((close, index) => {
    const priorClose = closes[index - 1] ?? close - 0.8;
    const open = Number((priorClose + wave(index, 0.22)).toFixed(2));
    const upperWick = 0.55 + ((index % 5) * 0.11);
    const lowerWick = 0.5 + ((index % 4) * 0.12);
    return {
      open,
      close,
      high: Number((Math.max(open, close) + upperWick).toFixed(2)),
      low: Number((Math.min(open, close) - lowerWick).toFixed(2)),
    };
  });
}

export function getWorkspacePriceRange(candles: WorkspaceCandle[], levels?: Partial<WorkspaceLevels>) {
  const candlePrices = candles.flatMap((candle) => [
    candle.open,
    candle.high,
    candle.low,
    candle.close,
  ]);
  const levelPrices = Object.values(levels ?? {}).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const prices = [...candlePrices, ...levelPrices];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = Math.max(1, (max - min) * 0.12);
  return { min: min - pad, max: max + pad };
}

export function getDefaultWorkspaceLevels(
  candles: WorkspaceCandle[],
  pattern: ChartPatternId
): WorkspaceLevels {
  const recent = candles.slice(-14);
  const support = Math.min(...recent.map((candle) => candle.low));
  const resistance = Math.max(...recent.map((candle) => candle.high));
  const range = Math.max(1, resistance - support);

  if (pattern === "slide-pressure") {
    return roundLevels({
      support: support + range * 0.12,
      resistance: resistance - range * 0.12,
      invalidation: resistance + range * 0.18,
    });
  }

  if (pattern === "support-retest") {
    return roundLevels({
      support: support + range * 0.18,
      resistance: resistance - range * 0.06,
      invalidation: support - range * 0.14,
    });
  }

  if (pattern === "breakout-retest") {
    const breakoutLine = support + range * 0.52;
    return roundLevels({
      support: breakoutLine,
      resistance,
      invalidation: breakoutLine - range * 0.22,
    });
  }

  return roundLevels({
    support: support + range * 0.08,
    resistance: resistance - range * 0.08,
    invalidation: support - range * 0.18,
  });
}

export function analyzeChartWorkspace({
  pair,
  timeframe,
  pattern,
  candles,
  levels,
}: {
  pair: string;
  timeframe: string;
  pattern: ChartPatternId;
  candles: WorkspaceCandle[];
  levels: WorkspaceLevels;
}): ChartWorkspaceFeedback {
  const last = candles[candles.length - 1];
  const recent = candles.slice(-8);
  const firstRecent = recent[0];
  const trend =
    last.close < firstRecent.close
      ? "lower highs / downside pressure"
      : last.close > firstRecent.close
        ? "higher lows / upside pressure"
        : "sideways range";
  const range = Math.max(1, levels.resistance - levels.support);
  const supportDistance = Math.abs(last.close - levels.support) / range;
  const resistanceDistance = Math.abs(last.close - levels.resistance) / range;
  const location =
    supportDistance < 0.22
      ? "near support"
      : resistanceDistance < 0.22
        ? "near resistance"
        : "between the main levels";
  const sorted = levels.support < levels.resistance;
  const invalidationSide =
    levels.invalidation > levels.resistance
      ? "above resistance"
      : levels.invalidation < levels.support
        ? "below support"
        : "inside the range";
  const quality = !sorted
    ? "Fix the levels first: support should be below resistance."
    : invalidationSide === "inside the range"
      ? "Weak map: invalidation is inside the range, so the plan may get noisy."
      : location === "between the main levels"
        ? "Middle of the map. This is usually a patience area for beginners."
        : "Cleaner map. Price is close enough to a level that confirmation can be defined.";

  const nextCheck =
    pattern === "slide-pressure"
      ? "Watch whether bounces keep failing below resistance or reclaim above it."
      : pattern === "support-retest"
        ? "Watch whether support reacts, then whether price can reclaim a minor high."
        : pattern === "breakout-retest"
          ? "Watch whether the breakout level holds as support or fails back into the range."
          : "Wait for price to reach support or resistance; the middle is lower quality.";

  const invalidationRead =
    invalidationSide === "inside the range"
      ? "Move invalidation outside the main support/resistance box before treating this as a clean plan."
      : `The practice thesis weakens ${invalidationSide} near ${formatLevel(levels.invalidation)}.`;

  const chartNote =
    `${pair || "Selected market"} on the ${timeframe || "selected"} chart. ` +
    `Trend: ${trend}. Key levels: support near ${formatLevel(levels.support)} and resistance near ${formatLevel(levels.resistance)}. ` +
    `Right now: price is ${location} near ${formatLevel(last.close)}. ` +
    `What to watch: ${nextCheck} ` +
    `Wrong if: ${invalidationRead}`;

  return {
    trend,
    location,
    quality,
    nextCheck,
    invalidationRead,
    chartNote,
  };
}

function roundLevels(levels: WorkspaceLevels): WorkspaceLevels {
  return {
    support: Number(levels.support.toFixed(2)),
    resistance: Number(levels.resistance.toFixed(2)),
    invalidation: Number(levels.invalidation.toFixed(2)),
  };
}

function wave(index: number, amount: number): number {
  return Math.sin(index * 1.7) * amount;
}

function formatLevel(value: number): string {
  return value >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : value.toFixed(2);
}
