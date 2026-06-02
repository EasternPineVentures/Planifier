export const CHART_CONTEXT_PROMPTS = [
  {
    label: "Trend",
    prompt: "Trend: price is making higher highs/lows, lower highs/lows, or moving sideways.",
  },
  {
    label: "Level",
    prompt: "Key level: price is near support, resistance, a prior high/low, or the middle of a range.",
  },
  {
    label: "Now",
    prompt: "Right now: price is testing, rejecting, retesting, breaking out, or chopping.",
  },
  {
    label: "Wrong if",
    prompt: "Wrong if: this idea is invalidated when price closes beyond a specific level or structure breaks.",
  },
] as const;

export function appendChartContextPrompt(current: string | undefined, prompt: string): string {
  const trimmedCurrent = current?.trim() ?? "";
  const trimmedPrompt = prompt.trim();
  if (!trimmedCurrent) return trimmedPrompt;
  if (trimmedCurrent.includes(trimmedPrompt)) return trimmedCurrent;
  return `${trimmedCurrent}\n${trimmedPrompt}`;
}
