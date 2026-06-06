import type { Plan } from "@/lib/plan/schema";

export const PLAN_DRAFT_STORAGE_KEY = "planifier.finishedDraft.v1";

export type StoredPlanDraft = {
  id: string;
  plan: Plan;
  createdAt: string;
  source: "saved" | "unsaved";
};
