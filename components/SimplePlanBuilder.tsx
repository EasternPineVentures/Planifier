"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@/lib/plan/schema";
import {
  MIN_CHART_NOTE_CHARS,
  validateInputs,
  type MissingField,
  type PlanInputs,
} from "@/lib/validation";
import { FIXED_RISK_PERCENT } from "@/lib/plan/risk";
import {
  MARKET_PAIR_GROUPS,
  getMarketPairOption,
} from "@/lib/plan/marketPairs";
import {
  PLAN_BUILDER_CONTEXT_STORAGE_KEY,
  type StoredBuilderContext,
} from "@/lib/plan/builderStorage";
import {
  PLAN_DRAFT_STORAGE_KEY,
  type StoredPlanDraft,
} from "@/lib/plan/draftStorage";

type BuilderStep = "context" | "chart" | "build";
type PracticeDirection = "long" | "short" | "stand-aside";
type LearningMode = "beginner" | "standard";

const STEPS: Array<{ id: BuilderStep; label: string; note: string }> = [
  { id: "context", label: "Context", note: "market, timeframe, direction" },
  { id: "chart", label: "Chart read", note: "trend, level, wrong-if" },
  { id: "build", label: "Build", note: "packet check, draft" },
];

const TIMEFRAMES = ["15m", "1H", "4H", "1D"] as const;
const HOLDING_PERIODS = ["Scalp", "Day", "Swing", "Position"] as const;
const DIRECTIONS: PracticeDirection[] = ["long", "short", "stand-aside"];

const FIELD_LABELS: Record<MissingField, string> = {
  ticker: "market",
  timeframe: "timeframe",
  holdingPeriod: "style",
  riskPercent: "risk",
  chart: "chart read",
};

const CHART_READ_TEMPLATE =
  "Trend: \nKey level: \nPrice now: \nWrong if: ";

export default function SimplePlanBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<BuilderStep>("context");
  const [inputs, setInputs] = useState<PlanInputs>({
    ticker: "BTC/USD",
    timeframe: "4H",
    holdingPeriod: "Swing",
    riskPercent: FIXED_RISK_PERCENT,
    chartNote: "",
  });
  const [practiceDirection, setPracticeDirection] =
    useState<PracticeDirection>("long");
  const [learningMode, setLearningMode] = useState<LearningMode>("beginner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromChart, setLoadedFromChart] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(
        PLAN_BUILDER_CONTEXT_STORAGE_KEY
      );
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredBuilderContext>;
      if (!parsed.chartNote) return;
      setInputs((current) => ({
        ...current,
        ticker: parsed.pair || current.ticker,
        timeframe: parsed.timeframe || current.timeframe,
        chartNote: parsed.chartNote ?? current.chartNote,
      }));
      setLoadedFromChart(true);
      setStep("chart");
    } catch {
      setLoadedFromChart(false);
    }
  }, []);

  const missing = useMemo(() => validateInputs(inputs), [inputs]);
  const ready = missing.length === 0;
  const selectedMarket = getMarketPairOption(inputs.ticker ?? "");
  const chartChars = inputs.chartNote?.trim().length ?? 0;
  const chartLabHref = `/chart?pair=${encodeURIComponent(
    inputs.ticker || "BTC/USD"
  )}&timeframe=${encodeURIComponent(inputs.timeframe || "4H")}`;

  function updateInputs(next: Partial<PlanInputs>) {
    setInputs((current) => ({
      ...current,
      ...next,
      riskPercent: FIXED_RISK_PERCENT,
    }));
    setError(null);
  }

  function openFinishedDraft(result: { id: string; plan: Plan }) {
    const draft: StoredPlanDraft = {
      id: result.id,
      plan: result.plan,
      createdAt: new Date().toISOString(),
      source: result.id ? "saved" : "unsaved",
    };

    try {
      window.sessionStorage.setItem(
        PLAN_DRAFT_STORAGE_KEY,
        JSON.stringify(draft)
      );
    } catch {
      setError("The draft was built, but the browser could not open it.");
      return;
    }

    router.push("/plan/draft");
  }

  async function buildPlan() {
    if (!ready || busy) {
      setStep("build");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const chartNote = [
        `Practice direction: ${practiceDirection}.`,
        inputs.chartNote?.trim() ?? "",
      ].join(" ");
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: {
            ticker: inputs.ticker ?? "",
            timeframe: inputs.timeframe ?? "",
            holdingPeriod: inputs.holdingPeriod,
            riskPercent: FIXED_RISK_PERCENT,
            chartNote,
          },
          imageDataUrl: null,
          learningMode,
          userQuestion:
            practiceDirection === "stand-aside"
              ? "Build this as a stand-aside practice plan unless the chart becomes clearer."
              : `Build this as a ${practiceDirection} practice map only if the confirmation and invalidation are clear.`,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { id?: string; plan?: Plan; message?: string }
        | null;

      if (response.ok && payload?.plan) {
        openFinishedDraft({ id: payload.id ?? "", plan: payload.plan });
        return;
      }

      if (response.status === 503 && payload?.plan) {
        openFinishedDraft({ id: "", plan: payload.plan });
        return;
      }

      setError(payload?.message ?? "Planifier could not build the draft.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Planifier could not build the draft."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-5">
      <header className="epv-hero grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-10">
        <div>
          <p className="epv-kicker">New plan / Paper-plan first</p>
          <h1 className="font-display mt-4 max-w-4xl text-4xl font-bold leading-[0.98] tracking-normal text-ink sm:text-5xl lg:text-6xl">
            Build one clean plan from one chart.
          </h1>
          <p className="epv-copy mt-5 max-w-3xl">
            Pick the market, read the chart, then build the finished draft on
            its own page. The goal is a reviewable practice rule, not a perfect
            prediction.
          </p>
        </div>

        <div className="epv-panel p-4">
          <p className="epv-kicker">Learning mode</p>
          <div className="mt-4 grid grid-cols-2 border border-border bg-bg">
            {(["beginner", "standard"] as LearningMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={learningMode === mode}
                onClick={() => setLearningMode(mode)}
                className={`min-h-12 border-r border-border px-3 text-sm last:border-r-0 ${
                  learningMode === mode
                    ? "bg-accent text-bg"
                    : "text-muted hover:text-ink"
                }`}
              >
                {mode === "beginner" ? "Still learning" : "Standard"}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Beginner mode explains chart language and indicator reads in plain
            English where it matters.
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="epv-panel-strong min-w-0">
          <StepTabs active={step} onChange={setStep} />
          <div className="p-4 sm:p-6">
            {step === "context" && (
              <ContextStep
                inputs={inputs}
                practiceDirection={practiceDirection}
                selectedMarketCopy={selectedMarket?.plainEnglish}
                chartLabHref={chartLabHref}
                onInputChange={updateInputs}
                onDirectionChange={setPracticeDirection}
                onNext={() => setStep("chart")}
              />
            )}

            {step === "chart" && (
              <ChartReadStep
                chartNote={inputs.chartNote ?? ""}
                loadedFromChart={loadedFromChart}
                chartChars={chartChars}
                chartLabHref={chartLabHref}
                onChartNoteChange={(chartNote) => updateInputs({ chartNote })}
                onBack={() => setStep("context")}
                onNext={() => setStep("build")}
              />
            )}

            {step === "build" && (
              <BuildStep
                missing={missing}
                ready={ready}
                busy={busy}
                error={error}
                onBack={() => setStep("chart")}
                onBuild={buildPlan}
              />
            )}
          </div>
        </main>

        <PlanPacket
          inputs={inputs}
          practiceDirection={practiceDirection}
          missing={missing}
          chartChars={chartChars}
        />
      </div>
    </section>
  );
}

function StepTabs({
  active,
  onChange,
}: {
  active: BuilderStep;
  onChange: (step: BuilderStep) => void;
}) {
  return (
    <div className="epv-step-strip bg-bg/55">
      {STEPS.map((item, index) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={active === item.id}
          onClick={() => onChange(item.id)}
          className="epv-step-tab"
        >
          <span className="block font-mono text-[10px] uppercase text-accent">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-display mt-2 block text-lg font-semibold leading-none">
            {item.label}
          </span>
          <span className="mt-2 block text-xs leading-relaxed text-muted">
            {item.note}
          </span>
        </button>
      ))}
    </div>
  );
}

function ContextStep({
  inputs,
  practiceDirection,
  selectedMarketCopy,
  chartLabHref,
  onInputChange,
  onDirectionChange,
  onNext,
}: {
  inputs: PlanInputs;
  practiceDirection: PracticeDirection;
  selectedMarketCopy?: string;
  chartLabHref: string;
  onInputChange: (next: Partial<PlanInputs>) => void;
  onDirectionChange: (direction: PracticeDirection) => void;
  onNext: () => void;
}) {
  return (
    <div className="grid gap-6">
      <StepHeading
        kicker="Context"
        title="Choose the chart and the practice direction."
        body="Keep this intentionally narrow. One chart, one timeframe, one idea."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="epv-kicker">Market list</span>
          <select
            value={inputs.ticker ?? ""}
            onChange={(event) => onInputChange({ ticker: event.target.value })}
            className="epv-select mt-2 px-3 py-3 text-sm"
          >
            {MARKET_PAIR_GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.symbol} value={option.symbol}>
                    {option.symbol} - {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
            {selectedMarketCopy ??
              "Use a simple symbol and focus on one chart at a time."}
          </p>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceGroup
            label="Timeframe"
            options={TIMEFRAMES}
            active={inputs.timeframe ?? ""}
            onSelect={(timeframe) => onInputChange({ timeframe })}
          />
          <ChoiceGroup
            label="Practice style"
            options={HOLDING_PERIODS}
            active={inputs.holdingPeriod ?? ""}
            onSelect={(holdingPeriod) => onInputChange({ holdingPeriod })}
          />
        </div>
      </div>

      <div>
        <p className="epv-kicker">Direction</p>
        <div className="mt-2 grid border border-border bg-bg sm:grid-cols-3">
          {DIRECTIONS.map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => onDirectionChange(direction)}
              className={`min-h-14 border-b border-border px-3 text-sm capitalize last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${
                practiceDirection === direction
                  ? direction === "long"
                    ? "bg-success/15 text-success"
                    : direction === "short"
                    ? "bg-danger/15 text-danger"
                    : "bg-accent/15 text-accent"
                  : "text-muted hover:text-ink"
              }`}
            >
              {direction}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href={chartLabHref} className="epv-button-ghost">
          Open chart lab
        </Link>
        <button type="button" onClick={onNext} className="epv-button-primary">
          Next: chart read
        </button>
      </div>
    </div>
  );
}

function ChartReadStep({
  chartNote,
  loadedFromChart,
  chartChars,
  chartLabHref,
  onChartNoteChange,
  onBack,
  onNext,
}: {
  chartNote: string;
  loadedFromChart: boolean;
  chartChars: number;
  chartLabHref: string;
  onChartNoteChange: (chartNote: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="grid gap-6">
      <StepHeading
        kicker="Chart read"
        title="Write only what the chart proves."
        body="Use the same order every time: trend, level, price now, wrong if."
      />

      {loadedFromChart && (
        <div className="border border-success/45 bg-success/10 p-3 text-xs leading-relaxed text-ink">
          Chart Lab loaded a read into this draft.
        </div>
      )}

      <div className="grid gap-px border border-border bg-border sm:grid-cols-4">
        {["Trend", "Level", "Price now", "Wrong if"].map((item) => (
          <div key={item} className="min-h-24 bg-bg p-4">
            <div className="font-mono text-[10px] uppercase text-muted">
              {item}
            </div>
          </div>
        ))}
      </div>

      <label className="block">
        <span className="epv-kicker">Written chart read</span>
        <textarea
          value={chartNote}
          onChange={(event) => onChartNoteChange(event.target.value)}
          rows={9}
          placeholder="Trend: higher lows on 4H. Key level: prior support near __. Price now: pulling back into that area. Wrong if: price closes below __."
          className="epv-textarea mt-2 resize-y p-3 text-sm leading-relaxed"
        />
      </label>

      <div className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted">
          {chartChars}/{MIN_CHART_NOTE_CHARS} useful characters minimum.
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChartNoteChange(CHART_READ_TEMPLATE)}
            className="epv-button-ghost min-h-10 px-3 text-xs"
          >
            Use template
          </button>
          <Link href={chartLabHref} className="epv-button-ghost min-h-10 px-3 text-xs">
            Open chart lab
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="epv-button-ghost">
          Back
        </button>
        <button type="button" onClick={onNext} className="epv-button-primary">
          Next: build
        </button>
      </div>
    </div>
  );
}

function BuildStep({
  missing,
  ready,
  busy,
  error,
  onBack,
  onBuild,
}: {
  missing: MissingField[];
  ready: boolean;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onBuild: () => void;
}) {
  return (
    <div className="grid gap-6">
      <StepHeading
        kicker="Build"
        title="Check the packet, then build the finished draft."
        body="The finished plan opens on a separate page so the builder does not crowd the review."
      />

      <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
        {(Object.keys(FIELD_LABELS) as MissingField[]).map((field) => {
          const done = !missing.includes(field);
          return (
            <div key={field} className="bg-bg p-4">
              <div className="font-mono text-[10px] uppercase text-muted">
                {FIELD_LABELS[field]}
              </div>
              <div className={done ? "mt-2 text-success" : "mt-2 text-muted"}>
                {done ? "Ready" : "Needs work"}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="border border-danger/50 bg-danger/10 p-3 text-sm leading-relaxed text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="epv-button-ghost">
          Back
        </button>
        <button
          type="button"
          onClick={onBuild}
          disabled={!ready || busy}
          className="epv-button-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Building..." : "Build finished draft"}
        </button>
      </div>
    </div>
  );
}

function PlanPacket({
  inputs,
  practiceDirection,
  missing,
  chartChars,
}: {
  inputs: PlanInputs;
  practiceDirection: PracticeDirection;
  missing: MissingField[];
  chartChars: number;
}) {
  return (
    <aside className="epv-panel-strong p-4 xl:sticky xl:top-24 xl:self-start">
      <p className="epv-kicker">Current packet</p>
      <div className="mt-4 grid border-y border-border">
        <PacketRow label="Market" value={inputs.ticker || "--"} />
        <PacketRow label="Timeframe" value={inputs.timeframe || "--"} />
        <PacketRow label="Style" value={inputs.holdingPeriod || "--"} />
        <PacketRow label="Direction" value={practiceDirection} />
        <PacketRow label="Risk" value={FIXED_RISK_PERCENT} />
        <PacketRow label="Chart read" value={`${chartChars} chars`} />
      </div>
      <div className="mt-4 border border-border bg-bg p-3 text-xs leading-relaxed text-muted">
        {missing.length === 0
          ? "Ready to build."
          : `Next: ${missing.map((field) => FIELD_LABELS[field]).join(", ")}.`}
      </div>
    </aside>
  );
}

function StepHeading({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="epv-kicker">{kicker}</p>
      <h2 className="font-display mt-2 text-3xl font-semibold leading-none text-ink">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function ChoiceGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  active: string;
  onSelect: (value: T) => void;
}) {
  return (
    <div>
      <div className="epv-kicker">{label}</div>
      <div className="mt-2 grid grid-cols-2 border border-border bg-bg">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`min-h-12 border-r border-t border-border px-2 text-sm first:border-t-0 odd:border-r even:border-r-0 [&:nth-child(2)]:border-t-0 ${
              active === option
                ? "bg-accent text-bg"
                : "text-muted hover:text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PacketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-border py-3 last:border-b-0">
      <span className="font-mono text-[10px] uppercase text-muted">
        {label}
      </span>
      <span className="truncate text-sm text-ink">{value}</span>
    </div>
  );
}
