export type ScenarioTone = "confirm" | "fail" | "wait";

export type ScenarioCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ScenarioBranch = {
  label: string;
  tone: ScenarioTone;
  path: number[];
  watchFor: string;
  ifHappens: string;
  invalidatedIf: string;
};

export type ScenarioChartExample = {
  id: string;
  title: string;
  setup: string;
  beginnerSummary: string;
  levelLabel: string;
  levelPrice: number;
  candles: ScenarioCandle[];
  branches: ScenarioBranch[];
  chartNoteSeed: string;
};

export const SCENARIO_CHART_EXAMPLES: ScenarioChartExample[] = [
  {
    id: "support-retest",
    title: "Support Retest",
    setup: "Price pulled back into a prior support zone after an uptrend.",
    beginnerSummary:
      "The lesson is patience: support only matters if price reacts there and gives proof.",
    levelLabel: "support",
    levelPrice: 58,
    candles: [
      { open: 50, high: 54, low: 48, close: 53 },
      { open: 53, high: 57, low: 52, close: 56 },
      { open: 56, high: 61, low: 55, close: 60 },
      { open: 60, high: 64, low: 59, close: 63 },
      { open: 63, high: 65, low: 60, close: 61 },
      { open: 61, high: 62, low: 58, close: 59 },
      { open: 59, high: 61, low: 56, close: 58 },
      { open: 58, high: 60, low: 56, close: 59 },
    ],
    branches: [
      {
        label: "Hold and reclaim",
        tone: "confirm",
        path: [60, 63, 66, 68],
        watchFor: "Support holds, then price reclaims the small pullback high.",
        ifHappens:
          "Practice a continuation plan only after the reclaim and retest are visible.",
        invalidatedIf: "Price closes below support instead of defending it.",
      },
      {
        label: "Support fails",
        tone: "fail",
        path: [56, 53, 51, 49],
        watchFor: "Price closes below support and cannot quickly reclaim it.",
        ifHappens:
          "Drop the bounce idea. The prior support may become resistance.",
        invalidatedIf: "Price immediately reclaims support and holds above it.",
      },
      {
        label: "Chop at level",
        tone: "wait",
        path: [58, 59, 57, 58],
        watchFor: "Price wiggles around support without a clear reclaim or breakdown.",
        ifHappens:
          "Stand aside and wait. No clean edge means no clean practice plan.",
        invalidatedIf: "A decisive close chooses one side of the level.",
      },
    ],
    chartNoteSeed:
      "Trend: price pulled back after higher highs and higher lows. Key level: prior support is being retested. Right now: price is reacting near support but has not clearly reclaimed yet. Wrong if: price closes below support and cannot reclaim it.",
  },
  {
    id: "failed-breakout",
    title: "Failed Breakout",
    setup: "Price pushed above resistance, then started slipping back into the range.",
    beginnerSummary:
      "The lesson is not to trust the first breakout. A breakout needs acceptance above the level.",
    levelLabel: "resistance",
    levelPrice: 70,
    candles: [
      { open: 59, high: 63, low: 58, close: 62 },
      { open: 62, high: 66, low: 61, close: 65 },
      { open: 65, high: 69, low: 64, close: 68 },
      { open: 68, high: 72, low: 67, close: 71 },
      { open: 71, high: 74, low: 69, close: 70 },
      { open: 70, high: 72, low: 67, close: 68 },
      { open: 68, high: 70, low: 65, close: 66 },
      { open: 66, high: 68, low: 64, close: 65 },
    ],
    branches: [
      {
        label: "Reclaim above",
        tone: "confirm",
        path: [70, 72, 74, 76],
        watchFor: "Price gets back above resistance and holds there.",
        ifHappens:
          "The failed-breakout idea is no longer clean; watch for acceptance above resistance.",
        invalidatedIf: "Price rejects resistance again and closes back inside the range.",
      },
      {
        label: "Failure follows through",
        tone: "fail",
        path: [64, 61, 59, 56],
        watchFor: "Price stays below resistance and sellers press lower.",
        ifHappens:
          "Practice mapping downside levels, but only after the failure is visible.",
        invalidatedIf: "Price reclaims resistance and holds above it.",
      },
      {
        label: "Range reset",
        tone: "wait",
        path: [66, 68, 65, 67],
        watchFor: "Price returns to the middle of the range with no follow-through.",
        ifHappens:
          "Wait for a clearer range edge. Middle-of-range trades are harder for beginners.",
        invalidatedIf: "Price reaches a clean edge and reacts decisively.",
      },
    ],
    chartNoteSeed:
      "Trend: price attempted to break above resistance. Key level: resistance is the breakout line. Right now: price slipped back under the breakout level. Wrong if: price reclaims resistance and holds above it.",
  },
  {
    id: "range-middle",
    title: "Range Middle",
    setup: "Price is stuck between support and resistance with no clean edge.",
    beginnerSummary:
      "The lesson is restraint: the middle of a range usually gives weaker decisions.",
    levelLabel: "range midpoint",
    levelPrice: 62,
    candles: [
      { open: 58, high: 64, low: 57, close: 63 },
      { open: 63, high: 67, low: 61, close: 66 },
      { open: 66, high: 68, low: 62, close: 63 },
      { open: 63, high: 65, low: 59, close: 60 },
      { open: 60, high: 63, low: 57, close: 58 },
      { open: 58, high: 62, low: 56, close: 61 },
      { open: 61, high: 64, low: 59, close: 62 },
      { open: 62, high: 65, low: 60, close: 63 },
    ],
    branches: [
      {
        label: "Push to resistance",
        tone: "confirm",
        path: [65, 67, 69, 70],
        watchFor: "Price moves toward resistance and reacts at the edge.",
        ifHappens:
          "Wait for the range edge before planning. The edge gives cleaner invalidation.",
        invalidatedIf: "Price stalls and falls back into the middle.",
      },
      {
        label: "Drop to support",
        tone: "fail",
        path: [60, 58, 56, 55],
        watchFor: "Price moves toward support and tests the lower edge.",
        ifHappens:
          "Wait for a support reaction or breakdown instead of guessing in the middle.",
        invalidatedIf: "Price snaps back above the midpoint with strength.",
      },
      {
        label: "More chop",
        tone: "wait",
        path: [62, 63, 61, 62],
        watchFor: "Price keeps rotating around the midpoint.",
        ifHappens:
          "Stand aside. This is the exact area where beginners usually force trades.",
        invalidatedIf: "Price leaves the midpoint and reaches a clean edge.",
      },
    ],
    chartNoteSeed:
      "Trend: price is moving sideways inside a range. Key level: price is near the range midpoint, not a clean edge. Right now: price is chopping without clear direction. Wrong if: price reaches support or resistance and gives a decisive reaction.",
  },
];

export function getScenarioChartExample(id: string): ScenarioChartExample {
  return (
    SCENARIO_CHART_EXAMPLES.find((example) => example.id === id) ??
    SCENARIO_CHART_EXAMPLES[0]
  );
}

export function buildScenarioChartNote(
  example: ScenarioChartExample,
  branch: ScenarioBranch
): string {
  return `${example.chartNoteSeed}\nScenario to pre-plan: ${branch.label}. Watch for: ${branch.watchFor} If it happens: ${branch.ifHappens} Invalidated if: ${branch.invalidatedIf}`;
}

export function getScenarioPriceRange(example: ScenarioChartExample): {
  min: number;
  max: number;
} {
  const candlePrices = example.candles.flatMap((candle) => [
    candle.open,
    candle.high,
    candle.low,
    candle.close,
  ]);
  const branchPrices = example.branches.flatMap((branch) => branch.path);
  const prices = [...candlePrices, ...branchPrices, example.levelPrice];
  return {
    min: Math.min(...prices) - 4,
    max: Math.max(...prices) + 4,
  };
}
