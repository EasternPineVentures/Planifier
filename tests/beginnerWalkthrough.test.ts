import { describe, expect, it } from "vitest";
import { getBeginnerWalkthroughSteps } from "@/lib/plan/beginnerWalkthrough";

describe("getBeginnerWalkthroughSteps", () => {
  it("starts by asking the learner to choose market context", () => {
    const steps = getBeginnerWalkthroughSteps({
      hasMarketContext: false,
      hasStartingAngles: false,
      hasSelectedAngle: false,
      fieldsReady: false,
      hasPlan: false,
      hasSavedPlan: false,
    });

    expect(steps[0]).toEqual({ id: "choose-context", status: "active" });
    expect(steps[1]).toEqual({ id: "find-angles", status: "waiting" });
  });

  it("moves from starting angles to field completion after an angle is selected", () => {
    const steps = getBeginnerWalkthroughSteps({
      hasMarketContext: true,
      hasStartingAngles: true,
      hasSelectedAngle: true,
      fieldsReady: false,
      hasPlan: false,
      hasSavedPlan: false,
    });

    expect(steps.map((step) => step.status)).toEqual([
      "done",
      "done",
      "done",
      "active",
      "waiting",
      "waiting",
    ]);
  });

  it("keeps the journal step active after a saved plan is built", () => {
    const steps = getBeginnerWalkthroughSteps({
      hasMarketContext: true,
      hasStartingAngles: true,
      hasSelectedAngle: true,
      fieldsReady: true,
      hasPlan: true,
      hasSavedPlan: false,
    });

    expect(steps.at(-2)).toEqual({ id: "build-plan", status: "done" });
    expect(steps.at(-1)).toEqual({ id: "journal", status: "active" });
  });
});
