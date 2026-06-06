import type { Plan } from "@/lib/plan/schema";
import { FIXED_RISK_PERCENT } from "@/lib/plan/risk";
import { buildSourceLinks } from "@/lib/sources/sourceLinks";
import {
  buildTradingViewChartUrl,
  normalizeLearningChartTimeframe,
} from "@/lib/market/learningChart";

export type ChartSavedPlanInput = {
  symbol: string;
  timeframe: string;
  entry: number;
  stop: number;
  target: number;
  riskReward: number | null;
  notes?: string | null;
  currentPrice?: number | null;
  selectedCandleTime?: string | null;
};

export type ChartSavedPlanResult = {
  plan: Plan;
  chartNote: string;
  holdingPeriod: "Scalp" | "Day" | "Swing" | "Position";
};

type ChartSaveDirection = NonNullable<Plan["chartSave"]>["direction"];

export function buildChartSavedPlan(
  input: ChartSavedPlanInput
): ChartSavedPlanResult {
  const symbol = normalizeSymbol(input.symbol);
  const timeframe = normalizeLearningChartTimeframe(input.timeframe);
  const direction = inferDirection(input.entry, input.target);
  const holdingPeriod = inferHoldingPeriod(timeframe);
  const tradingViewUrl = buildTradingViewChartUrl({
    symbol,
    timeframe,
  });
  const savedAt = new Date().toISOString();
  const riskRewardLabel =
    input.riskReward && Number.isFinite(input.riskReward)
      ? `${input.riskReward.toFixed(2)}R`
      : "not available";
  const levelLine =
    `Entry ${formatLevel(input.entry)}, stop ${formatLevel(input.stop)}, ` +
    `target ${formatLevel(input.target)}, estimated R/R ${riskRewardLabel}.`;
  const contextLine = [
    input.currentPrice
      ? `Current price near ${formatLevel(input.currentPrice)}.`
      : null,
    input.selectedCandleTime
      ? `Selected candle time ${input.selectedCandleTime}.`
      : null,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const chartNote = [
    `Saved from Planifier Learning Chart V1 for ${symbol} on ${timeframe}.`,
    levelLine,
    contextLine,
    "Educational paper-planning only; this is not a trade signal.",
  ]
    .filter(Boolean)
    .join(" ");

  const directionText =
    direction === "long"
      ? "long practice map"
      : direction === "short"
      ? "short practice map"
      : "stand-aside practice map";

  const plan: Plan = {
    disclaimer:
      "NOT FINANCIAL ADVICE. Educational and paper-trading planning only. This saved chart plan is a practice map, not a prediction or instruction to trade.",
    riskNotes: [
      `Risk is fixed at ${FIXED_RISK_PERCENT}; do not widen the stop to make the idea feel better.`,
      `This plan was saved from manual chart levels. Recheck the chart before any paper entry.`,
      "Public OHLC candles can lag, candles can repaint until closed, and exchange conditions can change quickly.",
    ],
    invalidation: {
      price: formatLevel(input.stop),
      condition: `The practice idea is invalid if price reaches or cleanly accepts beyond the saved stop area near ${formatLevel(
        input.stop
      )}.`,
    },
    bullishScenario:
      direction === "long"
        ? `${symbol} holds above the entry area and pushes toward the saved target without violating the stop.`
        : `${symbol} can still form a bullish failure case if sellers cannot hold price below the saved entry area.`,
    bearishScenario:
      direction === "short"
        ? `${symbol} rejects near the entry area and moves toward the saved target without violating the stop.`
        : `${symbol} fails if price loses the area that the saved stop was meant to protect.`,
    examplePlan: {
      direction,
      entryTrigger:
        direction === "stand-aside"
          ? "Stand aside until entry, stop, and target are separated into a clear practice map."
          : `Paper entry is only considered if price confirms around ${formatLevel(
              input.entry
            )}; do not treat the saved line as an automatic entry.`,
      stopConcept:
        `The stop/invalidation concept is the saved level near ${formatLevel(
          input.stop
        )}. If that area is reached first, the idea is wrong for practice.`,
      profitTargets: [
        `First planned target area: ${formatLevel(input.target)}.`,
        "After target one, review the journal instead of inventing a new plan mid-trade.",
      ],
      positionSizingNote:
        `Position size should be calculated from fixed ${FIXED_RISK_PERCENT} risk and the distance between entry and stop. Planifier does not size or execute trades.`,
    },
    decisionChecklist: [
      "Do not paper-enter just because the plan was saved.",
      "Check that the current chart still matches the saved entry, stop, and target map.",
      "Skip the plan if price already hit invalidation.",
      "Journal whether you followed the saved levels before changing anything.",
    ],
    journalPrompt:
      "Did I follow the saved chart levels, or did I move them after the market challenged the idea?",
    timeframeMismatchWarning: null,
    cognitiveBiases: [
      "False precision from exact saved prices",
      "Attachment to a saved idea after invalidation",
    ],
    chartSave: {
      origin: "learning_chart_v1",
      symbol,
      timeframe,
      entry: input.entry,
      stop: input.stop,
      target: input.target,
      riskReward: input.riskReward,
      direction,
      currentPrice: input.currentPrice ?? null,
      selectedCandleTime: input.selectedCandleTime ?? null,
      savedAt,
      tradingViewUrl,
    },
    strategyNotes: {
      plainEnglish:
        `This is a ${directionText} for ${symbol} on ${timeframe}. ${levelLine}`,
      actionableVersion:
        direction === "stand-aside"
          ? "I will stand aside until the chart levels form a valid practice map."
          : `I am only practicing this idea if price confirms near ${formatLevel(
              input.entry
            )}. I will not keep the idea alive beyond ${formatLevel(input.stop)}.`,
      learningExample:
        "A stronger beginner save includes why the level matters, what confirms it, and what proves it wrong.",
      rules: [
        "Wait for confirmation near the saved entry.",
        "Respect the saved stop as invalidation.",
        "Review the plan after target or invalidation before creating another one.",
      ],
      avoid: [
        "Do not move invalidation after entry",
        "Do not treat a saved chart as permission to trade",
      ],
      missingPieces: input.notes?.trim()
        ? []
        : ["Reason the selected level matters"],
    },
    beginnerGuide: {
      simpleSummary:
        `You saved a practice map for ${symbol}. The point is to remember the levels before emotions change them.`,
      keyTerms: [
        {
          term: "Entry",
          meaning: "The price area where the practice idea would start.",
          inThisPlan: formatLevel(input.entry),
        },
        {
          term: "Stop",
          meaning: "The area where the idea is wrong.",
          inThisPlan: formatLevel(input.stop),
        },
        {
          term: "Target",
          meaning: "The first planned reward area.",
          inThisPlan: formatLevel(input.target),
        },
        {
          term: "R/R",
          meaning: "A comparison between planned reward and planned risk.",
          inThisPlan: riskRewardLabel,
        },
      ],
      stepByStep: [
        "Open the saved plan before doing anything.",
        "Check if price is still near the saved map.",
        "Wait for confirmation near the entry.",
        "Stop following the idea if invalidation happens.",
      ],
      riskTranslation:
        `Fixed ${FIXED_RISK_PERCENT} risk means the practice idea must stay small and controlled even if it looks exciting.`,
    },
    trustedSourceLinks: buildSourceLinks({ assetTicker: symbol }),
  };

  return { plan, chartNote, holdingPeriod };
}

export function inferHoldingPeriod(
  timeframe: string
): ChartSavedPlanResult["holdingPeriod"] {
  const normalized = timeframe.trim().toLowerCase();
  if (normalized === "1m" || normalized === "5m") return "Scalp";
  if (normalized === "15m" || normalized === "1h") return "Day";
  if (normalized === "4h" || normalized === "1d") return "Swing";
  return "Day";
}

function inferDirection(
  entry: number,
  target: number
): ChartSaveDirection {
  if (target > entry) return "long";
  if (target < entry) return "short";
  return "stand-aside";
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().replace(/\s+/g, "").toUpperCase() || "BTC/USD";
}

function formatLevel(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(6);
}
