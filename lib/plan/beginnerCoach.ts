import type { MissingField, PlanInputs } from "@/lib/validation";

const COMMON_CRYPTO_BASES = new Set([
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "DOGE",
  "ADA",
  "AVAX",
  "LINK",
  "LTC",
  "BNB",
  "DOT",
  "MATIC",
]);

export function normalizeBeginnerExplorePair(ticker?: string | null): string {
  const clean = ticker?.trim().toUpperCase();
  if (!clean) return "BTC/USD";
  if (clean.includes("/")) return clean;
  if (clean.endsWith("USDT")) return `${clean.slice(0, -4)}/USD`;
  if (clean.endsWith("USD") && clean.length > 3) {
    return `${clean.slice(0, -3)}/USD`;
  }
  if (COMMON_CRYPTO_BASES.has(clean)) return `${clean}/USD`;
  return clean;
}

export function getBeginnerCoachMessage({
  inputs,
  missing,
}: {
  inputs: PlanInputs;
  missing: MissingField[];
}): string {
  const missingSet = new Set(missing);
  const pair = normalizeBeginnerExplorePair(inputs.ticker);
  const hasChartContext = Boolean(inputs.chartNote?.trim() || inputs.hasImage);

  if (missingSet.has("ticker")) {
    return (
      "Start with one market. If you are unsure, use BTC/USD first because it is liquid and easy to study. " +
      "Then choose one timeframe, such as 4H, and ask Planifier for beginner starting angles."
    );
  }

  if (missingSet.has("timeframe") || missingSet.has("holdingPeriod")) {
    return (
      `Good, ${pair} is enough to start. Your rough idea is a chart observation, not a complete plan yet. ` +
      "Next choose one timeframe and style. If you are unsure, use 4H and Unsure for the starting-angle search. " +
      "Then click Find starting angles so we can compare possible paths before building anything."
    );
  }

  if (missingSet.has("chart")) {
    return (
      `Good, ${pair} has a market and timeframe now. Next scan the chart in this order: trend, key level, what price is doing now, ` +
      "what would confirm the idea, and what would make it wrong. A screenshot also works."
    );
  }

  if (hasChartContext) {
    return (
      "Now you have enough for a paper-plan draft. Before building, check that the idea has a confirmation, an invalidation, " +
      "and a reason to stand aside if neither one appears."
    );
  }

  return (
    "Use the Start here panel first: choose one market, one timeframe, and one practice style. " +
    "Planifier will help find possible angles from there."
  );
}
