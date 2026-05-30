/**
 * Timeframe sanity check.
 *
 * First-pass rules only. Detects obvious mismatches between a chart timeframe
 * and the user's intended holding period. Returns a structured result so
 * callers (API routes, UI, future telemetry) all reason about it the same way.
 */

export type HoldingPeriod = "scalp" | "day" | "swing" | "position";

export type TimeframeCheck = {
  ok: boolean;
  severity: "none" | "warning" | "hard_warning";
  message?: string;
};

const MINUTE = 1;
const HOUR = 60;
const DAY = 60 * 24;
const WEEK = DAY * 7;

/**
 * Parse common chart timeframe strings into minutes.
 * Returns null if the input is not recognized — callers should treat that as
 * "cannot judge" rather than as an error.
 */
export function parseTimeframeMinutes(input: string): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  // Friendly aliases.
  if (s === "daily" || s === "1d") return DAY;
  if (s === "weekly" || s === "1w") return WEEK;
  if (s === "monthly" || s === "1mo" || s === "1mon") return DAY * 30;

  // <number><unit> like "5m", "15m", "1h", "4h", "1d", "1w".
  const m = s.match(/^(\d+)\s*(s|m|h|d|w|mo)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case "s":
      return Math.max(1, Math.round(n / 60));
    case "m":
      return n * MINUTE;
    case "h":
      return n * HOUR;
    case "d":
      return n * DAY;
    case "w":
      return n * WEEK;
    case "mo":
      return n * DAY * 30;
  }
  return null;
}

export function normalizeHoldingPeriod(
  input: string
): HoldingPeriod | null {
  const s = input.trim().toLowerCase();
  if (s === "scalp" || s === "scalping") return "scalp";
  if (s === "day" || s === "daytrade" || s === "day trade" || s === "intraday")
    return "day";
  if (s === "swing" || s === "swingtrade" || s === "swing trade") return "swing";
  if (s === "position" || s === "positiontrade" || s === "position trade")
    return "position";
  return null;
}

/**
 * Acceptable timeframe minute ranges per holding period.
 * Outside the "ok" band → warning; far outside → hard_warning.
 */
const OK_BANDS: Record<HoldingPeriod, { okMin: number; okMax: number }> = {
  scalp: { okMin: 1, okMax: 15 },
  day: { okMin: 1, okMax: 4 * HOUR },
  swing: { okMin: 1 * HOUR, okMax: 1 * DAY },
  position: { okMin: 4 * HOUR, okMax: 1 * WEEK },
};

export function checkTimeframeAlignment(
  chartTimeframe: string,
  holdingPeriod: HoldingPeriod
): TimeframeCheck {
  const minutes = parseTimeframeMinutes(chartTimeframe);
  if (minutes === null) {
    return {
      ok: true,
      severity: "none",
    };
  }

  const band = OK_BANDS[holdingPeriod];
  if (minutes >= band.okMin && minutes <= band.okMax) {
    return { ok: true, severity: "none" };
  }

  // "Hard" if the timeframe is more than ~8x off either end of the ok band.
  const ratio =
    minutes < band.okMin ? band.okMin / minutes : minutes / band.okMax;
  const severity: TimeframeCheck["severity"] =
    ratio >= 8 ? "hard_warning" : "warning";

  return {
    ok: false,
    severity,
    message: buildMessage(chartTimeframe, holdingPeriod, minutes < band.okMin),
  };
}

function buildMessage(
  chartTimeframe: string,
  holdingPeriod: HoldingPeriod,
  tooSmall: boolean
): string {
  const suggestions: Record<HoldingPeriod, string> = {
    scalp: "1m–15m",
    day: "1m–1H",
    swing: "1H–daily",
    position: "4H–weekly",
  };
  const direction = tooSmall ? "too granular" : "too coarse";
  return (
    `You uploaded a ${chartTimeframe} chart but selected ${holdingPeriod} trade. ` +
    `That is a mismatch — the chart is ${direction} for that holding period. ` +
    `Use ${suggestions[holdingPeriod]} for better context.`
  );
}
