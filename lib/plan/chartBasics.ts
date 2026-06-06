export type ChartBasicStepId =
  | "trend"
  | "levels"
  | "location"
  | "confirmation"
  | "invalidation"
  | "volume";

export type ChartBasicStep = {
  id: ChartBasicStepId;
  label: string;
  lookFor: string;
  whyItMatters: string;
  beginnerRule: string;
};

export const CHART_BASICS: ChartBasicStep[] = [
  {
    id: "trend",
    label: "1. Trend",
    lookFor: "Is price making higher highs/lows, lower highs/lows, or moving sideways?",
    whyItMatters: "Trend tells you whether the chart is pushing, fading, or chopping.",
    beginnerRule: "Name the direction before naming an idea.",
  },
  {
    id: "levels",
    label: "2. Key levels",
    lookFor: "Where did price bounce, reject, pause, or break before?",
    whyItMatters: "Levels are the places where your idea can become clearer or fail.",
    beginnerRule: "Start with support, resistance, and one wrong-if line.",
  },
  {
    id: "location",
    label: "3. Current location",
    lookFor: "Is price near support, near resistance, in the middle, or retesting a broken level?",
    whyItMatters: "The same idea can be high quality near a level and low quality in the middle.",
    beginnerRule: "If price is in the middle, patience is usually the lesson.",
  },
  {
    id: "confirmation",
    label: "4. Confirmation",
    lookFor: "What would price need to do next to make the idea more believable?",
    whyItMatters: "Confirmation keeps the plan from becoming a guess.",
    beginnerRule: "Write the clue before pretending there is a setup.",
  },
  {
    id: "invalidation",
    label: "5. Invalidation",
    lookFor: "What price action would prove the idea wrong?",
    whyItMatters: "Invalidation protects the lesson from turning into hope.",
    beginnerRule: "If you cannot name wrong-if, the idea is not ready.",
  },
  {
    id: "volume",
    label: "6. Volume context",
    lookFor: "Is activity expanding near the level, drying up, or staying average?",
    whyItMatters: "Volume can add context, but it does not prove the trade by itself.",
    beginnerRule: "Use volume as a question, not a command.",
  },
];

export function getChartBasicsChecklist(): string[] {
  return CHART_BASICS.map(
    (step) => `${step.label}: ${step.lookFor}`
  );
}
