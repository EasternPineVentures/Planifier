import { describe, expect, it } from "vitest";
import {
  buildScenarioChartNote,
  getScenarioChartExample,
  getScenarioPriceRange,
  SCENARIO_CHART_EXAMPLES,
} from "@/lib/plan/scenarioCharts";

describe("scenario chart examples", () => {
  it("defines examples with confirm, fail, and wait branches", () => {
    for (const example of SCENARIO_CHART_EXAMPLES) {
      const tones = new Set(example.branches.map((branch) => branch.tone));

      expect(tones).toEqual(new Set(["confirm", "fail", "wait"]));
    }
  });

  it("builds chart notes with branch-specific rules", () => {
    const example = getScenarioChartExample("support-retest");
    const branch = example.branches[0];
    const note = buildScenarioChartNote(example, branch);

    expect(note).toContain(example.chartNoteSeed);
    expect(note).toContain(branch.label);
    expect(note).toContain(branch.watchFor);
    expect(note).toContain(branch.invalidatedIf);
  });

  it("computes a padded price range for rendering", () => {
    const range = getScenarioPriceRange(getScenarioChartExample("failed-breakout"));

    expect(range.max).toBeGreaterThan(range.min);
    expect(range.max - range.min).toBeGreaterThan(10);
  });
});
