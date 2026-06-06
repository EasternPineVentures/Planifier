import type {
  ChartPatternId,
  ChartWorkspaceFeedback,
  WorkspaceCandle,
  WorkspaceLevels,
} from "@/lib/plan/chartWorkspace";

export const PRACTICE_TRADE_STORAGE_KEY = "planifier_practice_trades_v1";
export const PRACTICE_TRADE_LOCAL_LIMIT = 8;

export type PracticeTradeStatus =
  | "watching"
  | "paper-entered"
  | "reviewed"
  | "skipped";

export type PracticeTradeSnapshot = {
  id: string;
  savedAt: string;
  source: "chart-workspace-v1";
  pair: string;
  timeframe: string;
  style: string;
  patternId: ChartPatternId;
  patternLabel: string;
  status: PracticeTradeStatus;
  currentPrice: number;
  levels: WorkspaceLevels;
  chartNote: string;
  read: Pick<
    ChartWorkspaceFeedback,
    "trend" | "location" | "quality" | "nextCheck" | "invalidationRead"
  >;
};

const PATTERN_LABELS: Record<ChartPatternId, string> = {
  "slide-pressure": "Slide pressure",
  "support-retest": "Support retest",
  "breakout-retest": "Breakout retest",
  "range-chop": "Range chop",
};

export function buildPracticeTradeSnapshot({
  id,
  savedAt,
  pair,
  timeframe,
  style,
  pattern,
  candles,
  levels,
  feedback,
}: {
  id?: string;
  savedAt?: string;
  pair: string;
  timeframe: string;
  style: string;
  pattern: ChartPatternId;
  candles: WorkspaceCandle[];
  levels: WorkspaceLevels;
  feedback: ChartWorkspaceFeedback;
}): PracticeTradeSnapshot {
  const timestamp = savedAt ?? new Date().toISOString();
  const lastCandle = candles[candles.length - 1];

  return {
    id: id ?? createPracticeTradeId(timestamp),
    savedAt: timestamp,
    source: "chart-workspace-v1",
    pair: normalizeLabel(pair, "BTC/USD"),
    timeframe: normalizeLabel(timeframe, "4H"),
    style: normalizeLabel(style, "Unsure"),
    patternId: pattern,
    patternLabel: PATTERN_LABELS[pattern],
    status: "watching",
    currentPrice: Number(lastCandle.close.toFixed(2)),
    levels: {
      support: Number(levels.support.toFixed(2)),
      resistance: Number(levels.resistance.toFixed(2)),
      invalidation: Number(levels.invalidation.toFixed(2)),
    },
    chartNote: feedback.chartNote,
    read: {
      trend: feedback.trend,
      location: feedback.location,
      quality: feedback.quality,
      nextCheck: feedback.nextCheck,
      invalidationRead: feedback.invalidationRead,
    },
  };
}

export function summarizePracticeTrade(snapshot: PracticeTradeSnapshot): string {
  return (
    `${snapshot.pair} on ${snapshot.timeframe}. ` +
    `Current price ${snapshot.currentPrice.toFixed(2)}. ` +
    `Support ${snapshot.levels.support.toFixed(2)}, ` +
    `resistance ${snapshot.levels.resistance.toFixed(2)}, ` +
    `wrong-if ${snapshot.levels.invalidation.toFixed(2)}.`
  );
}

export function getPracticeTradeStatusLabel(
  status: PracticeTradeStatus
): string {
  if (status === "paper-entered") return "paper entered";
  return status;
}

function createPracticeTradeId(savedAt: string): string {
  const safeTime = savedAt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `practice-${safeTime}-${suffix}`;
}

function normalizeLabel(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}
