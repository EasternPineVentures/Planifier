export const FIXED_RISK_PERCENT = "1%";
export const FIXED_RISK_NUMERIC = "1";

export function normalizeFixedRiskPercent(): typeof FIXED_RISK_PERCENT {
  return FIXED_RISK_PERCENT;
}

export function isFixedRiskPercent(value?: string | null): boolean {
  const cleaned = value?.trim().replace(/\s+/g, "").replace(/%$/, "");
  if (!cleaned) return false;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) && numeric === Number(FIXED_RISK_NUMERIC);
}
