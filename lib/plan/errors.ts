/**
 * Single source of truth for user-facing error copy.
 * Keep the tone: direct, useful, never fake-positive, never robotic.
 */
export const PLAN_ERROR_MESSAGES = {
  MISSING_INPUT:
    "Planifier needs more context before building a useful plan. Add the asset, timeframe, holding period, risk per trade, and chart context.",
  AI_SCHEMA_FAILURE:
    "Planifier needs more concrete chart context. Add what price is doing, key levels, trend or structure, and what would invalidate the idea.",
  DATABASE_FAILURE:
    "The plan was generated, but saving failed. Try again before relying on this session.",
  UNAUTHORIZED:
    "You're signed out. Sign in again to build a plan.",
  UNKNOWN:
    "Something broke while building the plan. Not ideal. Try again, and if it repeats, check the deployment logs.",
} as const;

export type PlanErrorCode = keyof typeof PLAN_ERROR_MESSAGES;

export type PlanErrorBody = {
  code: PlanErrorCode;
  message: string;
  // Optional structured detail for the client (e.g., which inputs are missing).
  missing?: string[];
};

export function planError(code: PlanErrorCode, extra?: Partial<PlanErrorBody>): PlanErrorBody {
  return { code, message: PLAN_ERROR_MESSAGES[code], ...extra };
}
