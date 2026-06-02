import { describe, expect, it } from "vitest";
import {
  appendChartContextPrompt,
  CHART_CONTEXT_PROMPTS,
} from "@/lib/plan/chartContext";

describe("chart context prompts", () => {
  it("adds a beginner prompt to an empty chart note", () => {
    const note = appendChartContextPrompt("", CHART_CONTEXT_PROMPTS[0].prompt);

    expect(note).toBe(CHART_CONTEXT_PROMPTS[0].prompt);
  });

  it("appends prompts on new lines without duplicating them", () => {
    const first = appendChartContextPrompt(
      "BTC is near support.",
      CHART_CONTEXT_PROMPTS[1].prompt
    );
    const second = appendChartContextPrompt(first, CHART_CONTEXT_PROMPTS[1].prompt);

    expect(first).toContain("\n");
    expect(second).toBe(first);
  });
});
