import { checkTimeframeAlignment, normalizeHoldingPeriod } from "./plan/timeframe";

export type PlanInputs = {
  ticker?: string;
  timeframe?: string;
  holdingPeriod?: "Scalp" | "Day" | "Swing" | "Position" | "";
  riskPercent?: string;
  chartNote?: string;
  hasImage?: boolean;
};

export type MissingField =
  | "ticker"
  | "timeframe"
  | "holdingPeriod"
  | "riskPercent"
  | "chart";

export const MIN_CHART_NOTE_CHARS = 80;

const TICKER_RE = /^[A-Z0-9]{1,6}([.\-/][A-Z0-9]{1,6})?$/i;
const TIMEFRAME_RE = /^(\d+)\s?(s|m|h|H|d|D|w|W|M)$|^(1m|3m|5m|15m|30m|1H|2H|4H|6H|12H|1D|1W|1M|daily|weekly|monthly)$/i;
const RISK_RE = /^(\d+(\.\d+)?)\s?%?$/;

export function hasUsefulChartNote(note?: string): boolean {
  const trimmed = note?.trim() ?? "";
  if (trimmed.length < MIN_CHART_NOTE_CHARS) return false;

  const words = trimmed.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words).size >= 12;
}

export function validateInputs(input: PlanInputs): MissingField[] {
  const missing: MissingField[] = [];
  if (!input.ticker || !TICKER_RE.test(input.ticker.trim())) missing.push("ticker");
  if (!input.timeframe || !TIMEFRAME_RE.test(input.timeframe.trim())) missing.push("timeframe");
  if (!input.holdingPeriod) missing.push("holdingPeriod");
  if (!input.riskPercent || !RISK_RE.test(input.riskPercent.trim())) missing.push("riskPercent");
  if (!input.hasImage && !hasUsefulChartNote(input.chartNote)) {
    missing.push("chart");
  }
  return missing;
}

export function missingFieldsMessage(missing: MissingField[]): string {
  const labels: Record<MissingField, string> = {
    ticker: "asset ticker",
    timeframe: "chart timeframe",
    holdingPeriod: "holding period",
    riskPercent: "risk per trade %",
    chart: `chart screenshot or ${MIN_CHART_NOTE_CHARS}+ useful characters of written description`,
  };
  const list = missing.map((m) => labels[m]).join(", ");
  return `Missing ${list}. I cannot build a plan without ${
    missing.length === 1 ? "it" : "them"
  }. Provide ${missing.length === 1 ? "that" : "those"} first.`;
}

export function inferTimeframeMismatch(
  timeframe: string,
  holdingPeriod: PlanInputs["holdingPeriod"]
): string | null {
  if (!holdingPeriod) return null;
  const hp = normalizeHoldingPeriod(holdingPeriod);
  if (!hp) return null;
  const result = checkTimeframeAlignment(timeframe, hp);
  return result.ok ? null : result.message ?? null;
}
