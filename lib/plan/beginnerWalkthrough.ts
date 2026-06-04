export type BeginnerWalkthroughStepId =
  | "choose-context"
  | "find-angles"
  | "choose-angle"
  | "complete-fields"
  | "build-plan"
  | "journal";

export type BeginnerWalkthroughStatus = "done" | "active" | "waiting";

export type BeginnerWalkthroughStep = {
  id: BeginnerWalkthroughStepId;
  status: BeginnerWalkthroughStatus;
};

export type BeginnerWalkthroughState = {
  hasMarketContext: boolean;
  hasStartingAngles: boolean;
  hasSelectedAngle: boolean;
  fieldsReady: boolean;
  hasPlan: boolean;
  hasSavedPlan: boolean;
};

const STEP_IDS: BeginnerWalkthroughStepId[] = [
  "choose-context",
  "find-angles",
  "choose-angle",
  "complete-fields",
  "build-plan",
  "journal",
];

export function getBeginnerWalkthroughSteps(
  state: BeginnerWalkthroughState
): BeginnerWalkthroughStep[] {
  const doneByStep: Record<BeginnerWalkthroughStepId, boolean> = {
    "choose-context": state.hasMarketContext,
    "find-angles": state.hasStartingAngles,
    "choose-angle": state.hasSelectedAngle || state.fieldsReady,
    "complete-fields": state.fieldsReady,
    "build-plan": state.hasPlan,
    journal: state.hasSavedPlan,
  };

  const activeStep =
    STEP_IDS.find((stepId) => !doneByStep[stepId]) ?? "journal";

  return STEP_IDS.map((stepId) => ({
    id: stepId,
    status: doneByStep[stepId]
      ? "done"
      : stepId === activeStep
        ? "active"
        : "waiting",
  }));
}
