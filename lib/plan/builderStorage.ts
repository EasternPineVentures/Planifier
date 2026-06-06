export const PLAN_BUILDER_CONTEXT_STORAGE_KEY =
  "planifier.builderContext.v1";

export type StoredBuilderContext = {
  source: "chart_lab";
  createdAt: string;
  pair?: string;
  timeframe?: string;
  chartNote: string;
};
