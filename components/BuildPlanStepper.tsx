"use client";

import { useMemo, useRef, useState } from "react";
import PlanView from "@/components/PlanView";
import type { Plan } from "@/lib/plan/schema";
import {
  MIN_CHART_NOTE_CHARS,
  hasUsefulChartNote,
  inferTimeframeMismatch,
  validateInputs,
  type PlanInputs,
} from "@/lib/validation";

const TOTAL_STEPS = 5;
const ASSET_EXAMPLES = [
  "BTC/USD",
  "ETH/USD",
  "SPY",
  "QQQ",
  "NVDA",
  "AAPL",
  "EUR/USD",
  "XAU/USD",
] as const;
const TIMEFRAME_EXAMPLES = ["5m", "15m", "1H", "4H", "1D", "1W"] as const;
const RISK_EXAMPLES = ["0.25%", "0.5%", "1%", "2%"] as const;
const CONTEXT_EXAMPLES = ["Breakout", "Pullback", "Range", "Reversal"] as const;
const CONTEXT_CHECKLIST = [
  "Trend or market structure",
  "Key support and resistance levels",
  "What price is doing right now",
  "Volume, momentum, or volatility clue",
  "What would prove the idea wrong",
  "What you are unsure about",
] as const;
const QUESTION_EXAMPLES = [
  "Am I chasing this setup?",
  "What evidence is missing?",
  "What would invalidate the idea?",
  "Where should I be most patient?",
] as const;

type Step = 1 | 2 | 3 | 4 | 5;
type HoldingPeriod = Exclude<PlanInputs["holdingPeriod"], "" | undefined>;
type ContextExample = (typeof CONTEXT_EXAMPLES)[number];

const HOLDING_PERIODS: Array<{ value: HoldingPeriod; detail: string }> = [
  { value: "Scalp", detail: "Minutes to a few hours. Fast decisions." },
  { value: "Day", detail: "Intraday idea. Usually flat by session end." },
  { value: "Swing", detail: "Several days to a few weeks. More patience." },
  { value: "Position", detail: "Weeks or longer. Bigger thesis, wider risk." },
];

export default function BuildPlanStepper() {
  const [step, setStep] = useState<Step>(1);
  const [inputs, setInputs] = useState<PlanInputs>({
    ticker: "",
    timeframe: "",
    holdingPeriod: "",
    riskPercent: "",
    chartNote: "",
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<{
    code?: string;
    message: string;
  } | null>(null);
  const [structuredPlan, setStructuredPlan] = useState<{ id: string; plan: Plan } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const missing = useMemo(
    () => validateInputs({ ...inputs, hasImage: !!imageDataUrl }),
    [inputs, imageDataUrl]
  );

  const mismatch =
    inputs.timeframe && inputs.holdingPeriod
      ? inferTimeframeMismatch(inputs.timeframe, inputs.holdingPeriod)
      : null;

  const chartQuality = getChartContextQuality(inputs.chartNote, !!imageDataUrl);
  const chartNoteLength = inputs.chartNote?.trim().length ?? 0;

  const stepReady = {
    1: !!inputs.ticker && !missing.includes("ticker"),
    2:
      !!inputs.timeframe &&
      !missing.includes("timeframe") &&
      !!inputs.holdingPeriod &&
      !missing.includes("holdingPeriod"),
    3: !!inputs.riskPercent && !missing.includes("riskPercent"),
    4: !missing.includes("chart"),
    5: missing.length === 0,
  } as const;

  const canImproveContext =
    planError?.code === "AI_SCHEMA_FAILURE" || planError?.code === "MISSING_INPUT";

  function updateInputs(next: Partial<PlanInputs>) {
    setInputs((current) => ({ ...current, ...next }));
    setPlanError(null);
  }

  function nextStep() {
    setPlanError(null);
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as Step);
  }

  function prevStep() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function insertContextExample(kind: ContextExample) {
    updateInputs({ chartNote: buildSampleChartNote(kind, inputs) });
    setStep(4);
  }

  async function handleFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      alert("Image too big. Keep it under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setPlanError(null);
    };
    reader.readAsDataURL(file);
  }

  async function buildStructuredPlan() {
    if (missing.length > 0 || planBusy) return;
    setPlanBusy(true);
    setPlanError(null);
    setStructuredPlan(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs,
          imageDataUrl,
          userQuestion: question.trim() || undefined,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const data: unknown = ct.includes("application/json")
        ? await res.json()
        : { code: "UNKNOWN", message: await res.text() };

      if (res.ok) {
        const ok = data as { id: string; plan: Plan };
        setStructuredPlan(ok);
        return;
      }

      const errBody = data as {
        code?: string;
        message?: string;
        missing?: string[];
        plan?: Plan;
      };
      if (res.status === 503 && errBody.plan) {
        setStructuredPlan({ id: "", plan: errBody.plan });
      }
      if (errBody.missing?.includes("chart")) {
        setStep(4);
      }
      setPlanError({
        code: errBody.code,
        message:
          errBody.message ??
          "Something broke while building the plan. Try again, and if it repeats, check the deployment logs.",
      });
    } catch (e) {
      console.error(e);
      setPlanError({
        message:
          "Something broke while building the plan. Try again, and if it repeats, check the deployment logs.",
      });
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-border bg-panel p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Step {step} of {TOTAL_STEPS}
          </h2>
          <span className="text-xs text-muted">Build plan flow</span>
        </div>

        <div className="mb-5 h-1.5 rounded bg-border">
          <div
            className="h-1.5 rounded bg-accent transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">1. Asset</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Use the symbol for the market you are studying. Stocks usually use a
                ticker, crypto and forex usually use a pair.
              </p>
            </div>

            <div>
              <label className="text-xs text-muted">Asset or market</label>
              <input
                value={inputs.ticker ?? ""}
                onChange={(e) => updateInputs({ ticker: e.target.value.toUpperCase() })}
                placeholder="BTC/USD, NVDA, EUR/USD"
                className={`mt-1 w-full rounded border bg-bg p-3 text-sm ${
                  missing.includes("ticker") ? "border-danger" : "border-border"
                }`}
              />
            </div>

            <div>
              <span className="text-xs text-muted">Common examples</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {ASSET_EXAMPLES.map((asset) => (
                  <button
                    key={asset}
                    type="button"
                    onClick={() => updateInputs({ ticker: asset })}
                    className={`rounded border px-3 py-2 text-xs ${
                      inputs.ticker === asset
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-ink hover:border-muted"
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">2. Timeframe + Holding Period</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Timeframe is the candle size on the chart. Holding period is how long
                the idea is meant to stay alive if it behaves well.
              </p>
            </div>

            <div>
              <label className="text-xs text-muted">Chart timeframe</label>
              <input
                value={inputs.timeframe ?? ""}
                onChange={(e) => updateInputs({ timeframe: e.target.value })}
                placeholder="1m, 5m, 1H, 4H, daily"
                className={`mt-1 w-full rounded border bg-bg p-3 text-sm ${
                  missing.includes("timeframe") ? "border-danger" : "border-border"
                }`}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {TIMEFRAME_EXAMPLES.map((timeframe) => (
                  <button
                    key={timeframe}
                    type="button"
                    onClick={() => updateInputs({ timeframe })}
                    className={`rounded border px-3 py-2 text-xs ${
                      inputs.timeframe === timeframe
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-ink hover:border-muted"
                    }`}
                  >
                    {timeframe}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted">Holding period</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {HOLDING_PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => updateInputs({ holdingPeriod: p.value })}
                    className={`min-h-[76px] rounded border px-3 py-3 text-left text-sm ${
                      inputs.holdingPeriod === p.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-ink hover:border-muted"
                    }`}
                  >
                    <span className="block font-medium">{p.value}</span>
                    <span className="mt-1 block text-xs leading-snug text-muted">
                      {p.detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {mismatch && (
              <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
                <strong>Timeframe mismatch:</strong> {mismatch}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">3. Risk</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Risk is the maximum account percentage you are willing to lose if the
                plan is invalidated. It is not the same thing as position size.
              </p>
            </div>

            <div>
              <label className="text-xs text-muted">Risk per trade</label>
              <input
                value={inputs.riskPercent ?? ""}
                onChange={(e) => updateInputs({ riskPercent: e.target.value })}
                placeholder="0.5%, 1%, 2%"
                className={`mt-1 w-full rounded border bg-bg p-3 text-sm ${
                  missing.includes("riskPercent") ? "border-danger" : "border-border"
                }`}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {RISK_EXAMPLES.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => updateInputs({ riskPercent: risk })}
                    className={`rounded border px-3 py-2 text-xs ${
                      inputs.riskPercent === risk
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-ink hover:border-muted"
                    }`}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">4. Chart Context</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Chart context is the raw market read: what price is doing, where the
                important levels are, and what would make the idea wrong.
              </p>
            </div>

            <div>
              <label className="text-xs text-muted">Upload chart image (optional)</label>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                A screenshot helps, but one or two written notes still make the plan
                more focused.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="mt-2 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-border file:px-2 file:py-2 file:text-ink hover:file:bg-muted"
              />
            </div>

            {imageDataUrl && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL */}
                <img
                  src={imageDataUrl}
                  alt="chart preview"
                  className="h-16 w-auto rounded border border-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageDataUrl(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-xs text-muted underline"
                >
                  remove
                </button>
              </div>
            )}

            <div>
              <span className="text-xs text-muted">A useful note usually includes</span>
              <ul className="mt-2 grid list-disc gap-1 pl-5 text-xs leading-relaxed text-muted sm:grid-cols-2">
                {CONTEXT_CHECKLIST.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs text-muted">Need a starting point?</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONTEXT_EXAMPLES.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => insertContextExample(kind)}
                    className="min-h-10 rounded border border-border px-2 py-2 text-xs text-ink hover:border-muted"
                  >
                    {kind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted">
                Written chart context ({MIN_CHART_NOTE_CHARS}+ useful chars)
              </label>
              <textarea
                value={inputs.chartNote ?? ""}
                onChange={(e) => updateInputs({ chartNote: e.target.value })}
                rows={7}
                placeholder="Example: BTC/USD on 4H is pressing prior resistance after higher lows. A clean plan needs a close above the level and a successful retest. A close back below the retest area would invalidate the idea."
                className={`mt-1 w-full rounded border bg-bg p-3 text-sm leading-relaxed ${
                  missing.includes("chart") ? "border-danger" : "border-border"
                }`}
              />
              <div className="mt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs ${chartQuality.textClass}`}>
                    {chartQuality.label}
                  </span>
                  <span className="text-xs text-muted">
                    {chartNoteLength}/{MIN_CHART_NOTE_CHARS} minimum
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded bg-border">
                  <div
                    className={`h-1.5 rounded transition-all ${chartQuality.barClass}`}
                    style={{ width: `${chartQuality.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {chartQuality.help}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">5. Review + Generate</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Planifier will turn these inputs into an educational checklist,
                invalidation logic, risk notes, and source links.
              </p>
            </div>

            <div className="rounded border border-border bg-bg p-3 text-sm">
              <SummaryRow label="Asset" value={inputs.ticker || "-"} />
              <SummaryRow label="Timeframe" value={inputs.timeframe || "-"} />
              <SummaryRow label="Holding" value={inputs.holdingPeriod || "-"} />
              <SummaryRow label="Risk" value={inputs.riskPercent || "-"} />
              <SummaryRow
                label="Chart context"
                value={imageDataUrl ? "Image uploaded" : chartQuality.label}
              />
            </div>

            <div>
              <label className="text-xs text-muted">Optional focus question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="Optional: Ask what you want the plan to pay extra attention to."
                className="mt-1 w-full rounded border border-border bg-bg p-3 text-sm leading-relaxed"
              />
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {QUESTION_EXAMPLES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="rounded border border-border px-3 py-2 text-left text-xs text-ink hover:border-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {missing.length > 0 && (
              <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
                Missing inputs: {missing.join(", ")}
              </div>
            )}

            <button
              type="button"
              onClick={buildStructuredPlan}
              disabled={missing.length > 0 || planBusy}
              className="w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg disabled:opacity-40"
            >
              {planBusy ? "Building plan..." : "Build structured plan"}
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="w-full rounded border border-border px-3 py-3 text-sm disabled:opacity-40"
          >
            Back
          </button>
          {step < 5 && (
            <button
              type="button"
              onClick={nextStep}
              disabled={!stepReady[step]}
              className="w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg disabled:opacity-40"
            >
              Next
            </button>
          )}
        </div>
      </section>

      {planError && (
        <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
          <p>{planError.message}</p>
          {canImproveContext && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded border border-danger/50 px-3 py-2 text-left text-xs"
              >
                Improve chart context
              </button>
              <button
                type="button"
                onClick={() => insertContextExample("Pullback")}
                className="rounded border border-danger/50 px-3 py-2 text-left text-xs"
              >
                Insert sample context
              </button>
            </div>
          )}
        </div>
      )}

      {structuredPlan && (
        <section className="rounded border border-accent/30 bg-bg p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-muted">
              structured plan
            </span>
            <button
              onClick={() => setStructuredPlan(null)}
              className="text-[10px] text-muted underline"
            >
              clear
            </button>
          </div>
          <PlanView plan={structuredPlan.plan} planId={structuredPlan.id} />
        </section>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-1">
      <span className="text-xs uppercase text-muted">{label}</span>
      <span className="break-words text-right text-sm text-ink">{value}</span>
    </div>
  );
}

function getChartContextQuality(note: string | undefined, hasImage: boolean) {
  const trimmed = note?.trim() ?? "";

  if (hasImage && !trimmed) {
    return {
      label: "Image ready",
      help: "The screenshot is enough to continue. Add a short note if you want the plan to focus on a specific level or concern.",
      progress: 100,
      textClass: "text-accent",
      barClass: "bg-accent",
    };
  }

  if (hasImage) {
    return {
      label: "Image plus notes",
      help: "Good. The image carries the chart, and your notes tell Planifier what matters most.",
      progress: 100,
      textClass: "text-accent",
      barClass: "bg-accent",
    };
  }

  if (!trimmed) {
    return {
      label: "Needs chart context",
      help: "Write what you see on the chart. Start with trend, key levels, current price behavior, and invalidation.",
      progress: 0,
      textClass: "text-muted",
      barClass: "bg-border",
    };
  }

  if (!hasUsefulChartNote(trimmed)) {
    const progress = Math.min(
      85,
      Math.max(12, Math.round((trimmed.length / MIN_CHART_NOTE_CHARS) * 100))
    );
    const help =
      trimmed.length < MIN_CHART_NOTE_CHARS
        ? `Add ${MIN_CHART_NOTE_CHARS - trimmed.length} more useful characters. Filler text will not create a reliable plan.`
        : "This is long enough, but still too generic. Add concrete levels, structure, and what would prove the idea wrong.";
    return {
      label: "Too thin for a useful plan",
      help,
      progress,
      textClass: "text-danger",
      barClass: "bg-danger",
    };
  }

  if (trimmed.length < 180) {
    return {
      label: "Usable context",
      help: "This should work. More detail can make the checklist and invalidation logic sharper.",
      progress: 78,
      textClass: "text-accent",
      barClass: "bg-accent",
    };
  }

  return {
    label: "Strong context",
    help: "Good. This gives Planifier enough structure to produce a more useful paper-trade plan.",
    progress: 100,
    textClass: "text-accent",
    barClass: "bg-accent",
  };
}

function buildSampleChartNote(kind: ContextExample, inputs: PlanInputs) {
  const asset = (inputs.ticker || "BTC/USD").toUpperCase();
  const timeframe = inputs.timeframe || "4H";
  const risk = inputs.riskPercent || "1%";

  switch (kind) {
    case "Breakout":
      return `${asset} on the ${timeframe} chart is testing a prior resistance zone after building higher lows. The last push into this area faded quickly, so I want to know if a breakout would be clean or if it is extended. I would only consider the plan if price closes above resistance and holds that area on a retest. If price loses the higher-low structure or closes back inside the old range, the idea should be invalidated. Keep risk near ${risk}.`;
    case "Pullback":
      return `${asset} on the ${timeframe} chart has been trending up, then pulled back toward a prior support area. I am watching whether buyers defend the pullback or if the trend is weakening. A useful plan should separate a patient continuation setup from chasing the first green candle. Invalidation would be a clean break below support or a lower low that damages the trend structure. Keep risk near ${risk}.`;
    case "Range":
      return `${asset} on the ${timeframe} chart has been moving sideways between a clear support area and resistance area. Price is currently near the middle of the range, so I am unsure if there is enough edge yet. I want a plan that identifies where patience is better than forcing a trade, what evidence would matter near the range edges, and where invalidation would be if price breaks out or fails. Keep risk near ${risk}.`;
    case "Reversal":
      return `${asset} on the ${timeframe} chart has been in a downtrend, but price is starting to slow near a prior support area. There may be early signs of a reversal, but the structure is not confirmed yet. I want the plan to explain what confirmation would be needed, what would make this just a weak bounce, and where the idea is invalid if price makes another lower low. Keep risk near ${risk}.`;
  }
}
