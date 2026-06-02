import type { Candle } from "@/lib/market/kraken";
import type {
  ScenarioBranch,
  ScenarioChartExample,
  ScenarioTone,
} from "@/lib/plan/scenarioCharts";

export type HoldingPeriod = "Scalp" | "Day" | "Swing" | "Position";

export type HistoricalCandle = Candle & {
  source: "kraken_public_ohlc" | "fixture";
  intervalMinutes: number;
  committed: boolean;
};

export type StructureFeatures = {
  lastClose: number;
  support: number;
  resistance: number;
  midpoint: number;
  rangeWidth: number;
  averageRange: number;
  trendLabel: "uptrend" | "downtrend" | "sideways";
  rangePosition: "near support" | "middle of range" | "near resistance";
  distanceToSupport: number;
  distanceToResistance: number;
  recentBreakout: boolean;
  recentBreakdown: boolean;
  failedBreakout: boolean;
  failedBreakdown: boolean;
};

export type PatternId =
  | "support-retest"
  | "failed-breakout"
  | "range-middle"
  | "range-edge"
  | "trend-pullback";

export type PatternDetection = {
  patternId: PatternId;
  label: string;
  detected: boolean;
  score: number;
  evidenceQuality: "low" | "medium" | "high";
  levelLabel: string;
  levelPrice: number;
  explanation: string;
  invalidation: string;
  missingEvidence: string[];
};

export type SimilarEpisode = {
  index: number;
  distance: number;
  features: StructureFeatures;
  outcome: ScenarioTone;
  movePercent: number;
};

export type ScenarioEvidence = {
  source: "kraken_public_ohlc" | "fixture";
  pair: string;
  timeframe: string;
  holdingPeriod: HoldingPeriod;
  pattern: PatternDetection;
  historicalSampleCount: number;
  branchStats: Array<{
    tone: ScenarioTone;
    count: number;
    frequency: number;
    medianMovePercent: number;
  }>;
  warnings: string[];
  generatedAt: string;
};

export type HistoricalScenarioMap = ScenarioChartExample & {
  evidence: ScenarioEvidence;
};

const FEATURE_WINDOW = 60;
const SIMILARITY_LIMIT = 24;

export function normalizeHistoricalCandles({
  candles,
  source = "kraken_public_ohlc",
  intervalMinutes,
}: {
  candles: Candle[];
  source?: HistoricalCandle["source"];
  intervalMinutes: number;
}): HistoricalCandle[] {
  return candles
    .filter((candle) =>
      [candle.time, candle.open, candle.high, candle.low, candle.close].every(
        Number.isFinite
      )
    )
    .sort((a, b) => a.time - b.time)
    .map((candle) => ({
      ...candle,
      source,
      intervalMinutes,
      committed: true,
    }));
}

export function extractStructureFeatures(
  candles: Pick<Candle, "open" | "high" | "low" | "close">[]
): StructureFeatures {
  if (candles.length < 20) {
    throw new Error("At least 20 candles are required for structure features.");
  }

  const window = candles.slice(-FEATURE_WINDOW);
  const levelWindow = window.slice(-40);
  const priorLevelWindow = window.slice(-40, -4);
  const last = window[window.length - 1];
  const first = window[0];
  const support = Math.min(...levelWindow.map((candle) => candle.low));
  const resistance = Math.max(...levelWindow.map((candle) => candle.high));
  const priorSupport = Math.min(...priorLevelWindow.map((candle) => candle.low));
  const priorResistance = Math.max(
    ...priorLevelWindow.map((candle) => candle.high)
  );
  const rangeWidth = Math.max(resistance - support, Number.EPSILON);
  const midpoint = support + rangeWidth / 2;
  const rangePercent = (last.close - support) / rangeWidth;
  const averageRange =
    levelWindow.reduce((sum, candle) => sum + Math.abs(candle.high - candle.low), 0) /
    levelWindow.length;
  const changePercent = ((last.close - first.open) / first.open) * 100;
  const recentHigh = Math.max(...window.slice(-6).map((candle) => candle.high));
  const recentLow = Math.min(...window.slice(-6).map((candle) => candle.low));

  return {
    lastClose: round(last.close),
    support: round(support),
    resistance: round(resistance),
    midpoint: round(midpoint),
    rangeWidth: round(rangeWidth),
    averageRange: round(averageRange),
    trendLabel: detectTrend(window, changePercent),
    rangePosition:
      rangePercent <= 0.3
        ? "near support"
        : rangePercent >= 0.7
        ? "near resistance"
        : "middle of range",
    distanceToSupport: round((last.close - support) / rangeWidth),
    distanceToResistance: round((resistance - last.close) / rangeWidth),
    recentBreakout: last.close > priorResistance,
    recentBreakdown: last.close < priorSupport,
    failedBreakout: recentHigh > priorResistance && last.close < priorResistance,
    failedBreakdown: recentLow < priorSupport && last.close > priorSupport,
  };
}

export function detectPatterns(features: StructureFeatures): PatternDetection[] {
  const supportScore = scoreSupportRetest(features);
  const failedBreakoutScore = scoreFailedBreakout(features);
  const rangeMiddleScore = scoreRangeMiddle(features);
  const rangeEdgeScore =
    features.rangePosition === "near support" || features.rangePosition === "near resistance"
      ? 0.58
      : 0.25;
  const trendPullbackScore =
    features.trendLabel !== "sideways" && features.rangePosition !== "middle of range"
      ? 0.62
      : 0.3;

  const detections: PatternDetection[] = [
    {
      patternId: "support-retest",
      label: "Support retest",
      detected: supportScore >= 0.55,
      score: supportScore,
      evidenceQuality: qualityForScore(supportScore),
      levelLabel: "support",
      levelPrice: features.support,
      explanation:
        "Price is close to prior support. The useful question is whether that level attracts buyers or fails.",
      invalidation: "The support-retest idea is invalidated if price closes below support and cannot reclaim it.",
      missingEvidence:
        supportScore >= 0.55
          ? []
          : ["A clearer hold near support", "A reclaim candle or stronger reaction"],
    },
    {
      patternId: "failed-breakout",
      label: "Failed breakout",
      detected: failedBreakoutScore >= 0.55,
      score: failedBreakoutScore,
      evidenceQuality: qualityForScore(failedBreakoutScore),
      levelLabel: "resistance",
      levelPrice: features.resistance,
      explanation:
        "Price recently pushed above resistance but is not clearly holding above it.",
      invalidation: "The failed-breakout idea is invalidated if price reclaims resistance and holds above it.",
      missingEvidence:
        failedBreakoutScore >= 0.55
          ? []
          : ["A clearer rejection back below resistance", "Follow-through away from the breakout level"],
    },
    {
      patternId: "range-middle",
      label: "Range middle",
      detected: rangeMiddleScore >= 0.55,
      score: rangeMiddleScore,
      evidenceQuality: qualityForScore(rangeMiddleScore),
      levelLabel: "midpoint",
      levelPrice: features.midpoint,
      explanation:
        "Price is in the middle of the recent range, where beginner decisions are usually lower quality.",
      invalidation: "The range-middle read changes once price reaches a clean support or resistance edge.",
      missingEvidence:
        rangeMiddleScore >= 0.55
          ? []
          : ["A clearer sideways range", "More distance from both support and resistance"],
    },
    {
      patternId: "range-edge",
      label: "Range edge",
      detected: rangeEdgeScore >= 0.55,
      score: rangeEdgeScore,
      evidenceQuality: qualityForScore(rangeEdgeScore),
      levelLabel:
        features.rangePosition === "near resistance" ? "resistance" : "support",
      levelPrice:
        features.rangePosition === "near resistance"
          ? features.resistance
          : features.support,
      explanation:
        "Price is near a recent range edge, so the next useful question is reaction or break.",
      invalidation: "The range-edge idea is invalidated if price drifts back to the middle without a reaction.",
      missingEvidence: [],
    },
    {
      patternId: "trend-pullback",
      label: "Trend pullback",
      detected: trendPullbackScore >= 0.55,
      score: trendPullbackScore,
      evidenceQuality: qualityForScore(trendPullbackScore),
      levelLabel: features.trendLabel === "downtrend" ? "resistance" : "support",
      levelPrice:
        features.trendLabel === "downtrend" ? features.resistance : features.support,
      explanation:
        "Price is pulling toward a decision area while the broader trend structure is still visible.",
      invalidation: "The pullback idea is invalidated if the trend structure breaks instead of reacting.",
      missingEvidence: [],
    },
  ];
  return detections.sort((a, b) => b.score - a.score);
}

export function buildHistoricalScenarioMap({
  pair,
  timeframe,
  holdingPeriod,
  candles,
}: {
  pair: string;
  timeframe: string;
  holdingPeriod: HoldingPeriod;
  candles: HistoricalCandle[];
}): HistoricalScenarioMap {
  if (candles.length < FEATURE_WINDOW + 20) {
    throw new Error("Not enough historical candles for scenario mapping.");
  }

  const currentWindow = candles.slice(-FEATURE_WINDOW);
  const features = extractStructureFeatures(currentWindow);
  const pattern = choosePattern(detectPatterns(features));
  const outcomeWindow = holdingPeriodToOutcomeWindow(holdingPeriod);
  const episodes = findSimilarEpisodes({
    candles,
    currentFeatures: features,
    pattern,
    outcomeWindow,
  });
  const branchStats = buildBranchStats(episodes);
  const warnings = buildWarnings(episodes.length, pattern);
  const branches = buildBranches({ pattern, features, branchStats });
  const lastCandles = candles.slice(-10).map((candle) => ({
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));

  return {
    id: `historical-${pattern.patternId}`,
    title: `${pattern.label} map`,
    setup: pattern.explanation,
    beginnerSummary:
      "This is based on similar recent candle structures. Treat it as scenario practice, not a prediction.",
    levelLabel: pattern.levelLabel,
    levelPrice: pattern.levelPrice,
    candles: lastCandles,
    branches,
    chartNoteSeed: buildChartNoteSeed({ pair, timeframe, features, pattern }),
    evidence: {
      source: candles[0]?.source ?? "kraken_public_ohlc",
      pair,
      timeframe,
      holdingPeriod,
      pattern,
      historicalSampleCount: episodes.length,
      branchStats,
      warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function findSimilarEpisodes({
  candles,
  currentFeatures,
  pattern,
  outcomeWindow,
}: {
  candles: HistoricalCandle[];
  currentFeatures: StructureFeatures;
  pattern: PatternDetection;
  outcomeWindow: number;
}): SimilarEpisode[] {
  const lastUsableIndex = candles.length - outcomeWindow - 2;
  const episodes: SimilarEpisode[] = [];

  for (let index = FEATURE_WINDOW; index <= lastUsableIndex; index += 1) {
    const window = candles.slice(index - FEATURE_WINDOW, index);
    if (window.length < FEATURE_WINDOW) continue;
    const features = extractStructureFeatures(window);
    const distance = featureDistance(currentFeatures, features);
    if (distance > 0.9) continue;
    episodes.push({
      index,
      distance,
      features,
      outcome: classifyOutcome({
        candles,
        index,
        features,
        pattern,
        outcomeWindow,
      }),
      movePercent: futureMovePercent(candles, index, outcomeWindow),
    });
  }

  return episodes
    .sort((a, b) => a.distance - b.distance)
    .slice(0, SIMILARITY_LIMIT);
}

export function holdingPeriodToOutcomeWindow(holdingPeriod: HoldingPeriod): number {
  switch (holdingPeriod) {
    case "Scalp":
      return 8;
    case "Day":
      return 16;
    case "Swing":
      return 30;
    case "Position":
      return 60;
  }
}

function choosePattern(patterns: PatternDetection[]): PatternDetection {
  return patterns.find((pattern) => pattern.detected) ?? patterns[0];
}

function scoreSupportRetest(features: StructureFeatures): number {
  let score = 0.25;
  if (features.rangePosition === "near support") score += 0.35;
  if (features.trendLabel === "uptrend") score += 0.2;
  if (features.failedBreakdown) score += 0.15;
  if (features.distanceToSupport <= 0.2) score += 0.1;
  return clamp(score);
}

function scoreFailedBreakout(features: StructureFeatures): number {
  let score = 0.2;
  if (features.failedBreakout) score += 0.45;
  if (features.rangePosition === "near resistance") score += 0.15;
  if (features.trendLabel !== "uptrend") score += 0.1;
  return clamp(score);
}

function scoreRangeMiddle(features: StructureFeatures): number {
  let score = 0.25;
  if (features.rangePosition === "middle of range") score += 0.35;
  if (features.trendLabel === "sideways") score += 0.25;
  if (!features.recentBreakout && !features.recentBreakdown) score += 0.1;
  return clamp(score);
}

function detectTrend(
  candles: Pick<Candle, "open" | "high" | "low" | "close">[],
  changePercent: number
): StructureFeatures["trendLabel"] {
  const firstHalf = candles.slice(0, Math.floor(candles.length / 2));
  const secondHalf = candles.slice(Math.floor(candles.length / 2));
  const firstHigh = Math.max(...firstHalf.map((candle) => candle.high));
  const secondHigh = Math.max(...secondHalf.map((candle) => candle.high));
  const firstLow = Math.min(...firstHalf.map((candle) => candle.low));
  const secondLow = Math.min(...secondHalf.map((candle) => candle.low));

  if (secondHigh > firstHigh && secondLow > firstLow && changePercent > 0.75) {
    return "uptrend";
  }
  if (secondHigh < firstHigh && secondLow < firstLow && changePercent < -0.75) {
    return "downtrend";
  }
  return "sideways";
}

function featureDistance(a: StructureFeatures, b: StructureFeatures): number {
  const trendPenalty = a.trendLabel === b.trendLabel ? 0 : 0.2;
  const positionPenalty = a.rangePosition === b.rangePosition ? 0 : 0.18;
  const supportDistance = Math.abs(a.distanceToSupport - b.distanceToSupport);
  const resistanceDistance = Math.abs(
    a.distanceToResistance - b.distanceToResistance
  );
  const volatilityDistance = Math.abs(
    normalize(a.averageRange, a.rangeWidth) - normalize(b.averageRange, b.rangeWidth)
  );
  return (
    trendPenalty +
    positionPenalty +
    supportDistance * 0.22 +
    resistanceDistance * 0.22 +
    volatilityDistance * 0.2
  );
}

function classifyOutcome({
  candles,
  index,
  features,
  pattern,
  outcomeWindow,
}: {
  candles: HistoricalCandle[];
  index: number;
  features: StructureFeatures;
  pattern: PatternDetection;
  outcomeWindow: number;
}): ScenarioTone {
  const start = candles[index - 1];
  const future = candles.slice(index, index + outcomeWindow);
  const maxFuture = Math.max(...future.map((candle) => candle.high));
  const minFuture = Math.min(...future.map((candle) => candle.low));
  const threshold = Math.max(features.averageRange * 1.25, features.rangeWidth * 0.08);

  if (pattern.patternId === "failed-breakout") {
    if (minFuture < start.close - threshold) return "confirm";
    if (maxFuture > features.resistance + threshold * 0.5) return "fail";
    return "wait";
  }

  if (pattern.patternId === "range-middle") {
    if (maxFuture >= features.resistance - threshold * 0.5) return "confirm";
    if (minFuture <= features.support + threshold * 0.5) return "fail";
    return "wait";
  }

  if (maxFuture > start.close + threshold) return "confirm";
  if (minFuture < features.support - threshold * 0.5) return "fail";
  return "wait";
}

function futureMovePercent(
  candles: HistoricalCandle[],
  index: number,
  outcomeWindow: number
): number {
  const start = candles[index - 1];
  const future = candles.slice(index, index + outcomeWindow);
  const end = future[future.length - 1] ?? start;
  return round(((end.close - start.close) / start.close) * 100);
}

function buildBranchStats(episodes: SimilarEpisode[]): ScenarioEvidence["branchStats"] {
  return (["confirm", "fail", "wait"] as const).map((tone) => {
    const matching = episodes.filter((episode) => episode.outcome === tone);
    return {
      tone,
      count: matching.length,
      frequency: episodes.length ? round(matching.length / episodes.length) : 0,
      medianMovePercent: median(matching.map((episode) => episode.movePercent)),
    };
  });
}

function buildBranches({
  pattern,
  features,
  branchStats,
}: {
  pattern: PatternDetection;
  features: StructureFeatures;
  branchStats: ScenarioEvidence["branchStats"];
}): ScenarioBranch[] {
  const avg = Math.max(features.averageRange, features.rangeWidth * 0.04);
  const confirmStats = branchStats.find((stat) => stat.tone === "confirm");
  const failStats = branchStats.find((stat) => stat.tone === "fail");
  const waitStats = branchStats.find((stat) => stat.tone === "wait");
  const confirmFrequency = formatFrequency(confirmStats?.frequency ?? 0);
  const failFrequency = formatFrequency(failStats?.frequency ?? 0);
  const waitFrequency = formatFrequency(waitStats?.frequency ?? 0);

  if (pattern.patternId === "failed-breakout") {
    return [
      {
        label: `Failure follows through (${confirmFrequency})`,
        tone: "confirm",
        path: [
          features.lastClose - avg * 0.4,
          features.lastClose - avg * 1.1,
          features.lastClose - avg * 1.8,
          features.lastClose - avg * 2.4,
        ].map(round),
        watchFor: "Price stays below resistance and sellers continue pressing lower.",
        ifHappens:
          "Treat the failed-breakout scenario as active only after follow-through is visible.",
        invalidatedIf: pattern.invalidation,
      },
      {
        label: `Reclaim above (${failFrequency})`,
        tone: "fail",
        path: [
          features.resistance,
          features.resistance + avg * 0.6,
          features.resistance + avg * 1.2,
          features.resistance + avg * 1.5,
        ].map(round),
        watchFor: "Price reclaims resistance and starts accepting above it.",
        ifHappens: "Drop the failed-breakout read and reassess acceptance above the level.",
        invalidatedIf: "A fresh rejection back below resistance would weaken the reclaim.",
      },
      waitBranch({ features, frequency: waitFrequency }),
    ];
  }

  if (pattern.patternId === "range-middle") {
    return [
      {
        label: `Push to resistance (${confirmFrequency})`,
        tone: "confirm",
        path: [
          features.midpoint + avg * 0.5,
          features.midpoint + avg,
          features.resistance - avg * 0.3,
          features.resistance,
        ].map(round),
        watchFor: "Price leaves the midpoint and reaches the upper range edge.",
        ifHappens: "Wait for the edge reaction before building a stronger plan.",
        invalidatedIf: "Price falls back into the midpoint with no edge reaction.",
      },
      {
        label: `Drop to support (${failFrequency})`,
        tone: "fail",
        path: [
          features.midpoint - avg * 0.5,
          features.midpoint - avg,
          features.support + avg * 0.3,
          features.support,
        ].map(round),
        watchFor: "Price leaves the midpoint and tests the lower range edge.",
        ifHappens: "Wait for support reaction or breakdown evidence instead of guessing.",
        invalidatedIf: "Price snaps back above the midpoint with strength.",
      },
      waitBranch({ features, frequency: waitFrequency }),
    ];
  }

  return [
    {
      label: `Hold and reclaim (${confirmFrequency})`,
      tone: "confirm",
      path: [
        features.lastClose + avg * 0.4,
        features.lastClose + avg,
        features.lastClose + avg * 1.7,
        Math.min(features.resistance, features.lastClose + avg * 2.4),
      ].map(round),
      watchFor: "Price holds the level, then reclaims a smaller pullback high.",
      ifHappens:
        "Practice the continuation branch only after the hold and reclaim are visible.",
      invalidatedIf: pattern.invalidation,
    },
    {
      label: `Level fails (${failFrequency})`,
      tone: "fail",
      path: [
        features.support - avg * 0.3,
        features.support - avg,
        features.support - avg * 1.5,
        features.support - avg * 2,
      ].map(round),
      watchFor: "Price closes below support and cannot quickly reclaim it.",
      ifHappens: "Drop the support/retest idea and reassess from the next clear level.",
      invalidatedIf: "Price quickly reclaims support and holds above it.",
    },
    waitBranch({ features, frequency: waitFrequency }),
  ];
}

function waitBranch({
  features,
  frequency,
}: {
  features: StructureFeatures;
  frequency: string;
}): ScenarioBranch {
  return {
    label: `Chop or unresolved (${frequency})`,
    tone: "wait",
    path: [
      features.lastClose,
      features.midpoint,
      features.lastClose - features.averageRange * 0.3,
      features.lastClose + features.averageRange * 0.2,
    ].map(round),
    watchFor: "Price rotates without choosing a clean side of the level.",
    ifHappens: "Stand aside. No resolution means no clean practice plan.",
    invalidatedIf: "A decisive candle leaves the chop and chooses a side.",
  };
}

function buildChartNoteSeed({
  pair,
  timeframe,
  features,
  pattern,
}: {
  pair: string;
  timeframe: string;
  features: StructureFeatures;
  pattern: PatternDetection;
}): string {
  return (
    `${pair} ${timeframe}: detected ${pattern.label.toLowerCase()}. ` +
    `Trend: ${features.trendLabel}. ` +
    `Key level: ${pattern.levelLabel} near ${pattern.levelPrice}. ` +
    `Right now: price is ${features.rangePosition} in the recent range. ` +
    `Wrong if: ${pattern.invalidation}`
  );
}

function buildWarnings(sampleCount: number, pattern: PatternDetection): string[] {
  const warnings: string[] = [];
  if (sampleCount < 8) {
    warnings.push("Low sample count. Treat this as practice, not statistical proof.");
  }
  if (pattern.evidenceQuality === "low") {
    warnings.push("Pattern evidence is weak. The scenario map may be generic.");
  }
  return warnings;
}

function qualityForScore(score: number): PatternDetection["evidenceQuality"] {
  if (score >= 0.75) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

function normalize(value: number, scale: number): number {
  return value / Math.max(scale, Number.EPSILON);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return round(sorted[middle]);
  return round((sorted[middle - 1] + sorted[middle]) / 2);
}

function formatFrequency(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, round(value)));
}

function round(value: number): number {
  if (Math.abs(value) >= 100) return Number(value.toFixed(2));
  if (Math.abs(value) >= 1) return Number(value.toFixed(4));
  return Number(value.toFixed(8));
}
