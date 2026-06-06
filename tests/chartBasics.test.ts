import { describe, expect, it } from "vitest";
import {
  CHART_BASICS,
  getChartBasicsChecklist,
} from "@/lib/plan/chartBasics";

describe("chart basics", () => {
  it("teaches a stable beginner scan order", () => {
    expect(CHART_BASICS.map((step) => step.id)).toEqual([
      "trend",
      "levels",
      "location",
      "confirmation",
      "invalidation",
      "volume",
    ]);
  });

  it("keeps invalidation and confirmation in the checklist", () => {
    const checklist = getChartBasicsChecklist().join(" ");

    expect(checklist).toContain("Confirmation");
    expect(checklist).toContain("Invalidation");
  });
});
