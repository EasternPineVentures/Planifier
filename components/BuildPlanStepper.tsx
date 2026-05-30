"use client";

import { useMemo, useRef, useState } from "react";
import PlanView from "@/components/PlanView";
import type { Plan } from "@/lib/plan/schema";
import {
  inferTimeframeMismatch,
  validateInputs,
  type PlanInputs,
} from "@/lib/validation";

const HOLDING_PERIODS = ["Scalp", "Day", "Swing", "Position"] as const;
const TOTAL_STEPS = 5;

type Step = 1 | 2 | 3 | 4 | 5;

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
  const [planError, setPlanError] = useState<string | null>(null);
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

  function nextStep() {
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as Step);
  }

  function prevStep() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function handleFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      alert("Image too big. Keep it under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
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
        plan?: Plan;
      };
      if (res.status === 503 && errBody.plan) {
        setStructuredPlan({ id: "", plan: errBody.plan });
      }
      setPlanError(
        errBody.message ??
          "Something broke while building the plan. Not ideal. Try again, and if it repeats, check the deployment logs."
      );
    } catch (e) {
      console.error(e);
      setPlanError(
        "Something broke while building the plan. Not ideal. Try again, and if it repeats, check the deployment logs."
      );
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-border bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Step {step} of {TOTAL_STEPS}
          </h2>
          <span className="text-xs text-muted">Build plan flow</span>
        </div>

        <div className="mb-4 h-1.5 rounded bg-border">
          <div
            className="h-1.5 rounded bg-accent transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">1. Asset</h3>
            <label className="text-xs text-muted">Ticker</label>
            <input
              value={inputs.ticker ?? ""}
              onChange={(e) =>
                setInputs({ ...inputs, ticker: e.target.value.toUpperCase() })
              }
              placeholder="BTC/USD, NVDA, EUR/USD"
              className={`w-full rounded border bg-bg p-3 text-sm ${
                missing.includes("ticker") ? "border-danger" : "border-border"
              }`}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">2. Timeframe + Holding Period</h3>
            <div>
              <label className="text-xs text-muted">Timeframe</label>
              <input
                value={inputs.timeframe ?? ""}
                onChange={(e) =>
                  setInputs({ ...inputs, timeframe: e.target.value })
                }
                placeholder="1m, 5m, 1H, 4H, daily"
                className={`mt-1 w-full rounded border bg-bg p-3 text-sm ${
                  missing.includes("timeframe") ? "border-danger" : "border-border"
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-muted">Holding period</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {HOLDING_PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setInputs({ ...inputs, holdingPeriod: p })}
                    className={`rounded border px-3 py-3 text-sm ${
                      inputs.holdingPeriod === p
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-ink"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {mismatch && (
              <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
                <strong>Timeframe mismatch:</strong> {mismatch}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">3. Risk</h3>
            <label className="text-xs text-muted">Risk per trade</label>
            <input
              value={inputs.riskPercent ?? ""}
              onChange={(e) =>
                setInputs({ ...inputs, riskPercent: e.target.value })
              }
              placeholder="0.5%, 1%, 2%"
              className={`w-full rounded border bg-bg p-3 text-sm ${
                missing.includes("riskPercent") ? "border-danger" : "border-border"
              }`}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">4. Chart Context</h3>
            <label className="text-xs text-muted">Upload chart image (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-border file:px-2 file:py-2 file:text-ink"
            />

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
              <label className="text-xs text-muted">Or write chart notes (20+ chars)</label>
              <textarea
                value={inputs.chartNote ?? ""}
                onChange={(e) =>
                  setInputs({ ...inputs, chartNote: e.target.value })
                }
                rows={4}
                placeholder="Levels, trend, volume, structure, potential entry/exit..."
                className={`mt-1 w-full rounded border bg-bg p-3 text-sm ${
                  missing.includes("chart") ? "border-danger" : "border-border"
                }`}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">5. Review + Generate</h3>
            <div className="rounded border border-border bg-bg p-3 text-sm">
              <SummaryRow label="Ticker" value={inputs.ticker || "-"} />
              <SummaryRow label="Timeframe" value={inputs.timeframe || "-"} />
              <SummaryRow label="Holding" value={inputs.holdingPeriod || "-"} />
              <SummaryRow label="Risk" value={inputs.riskPercent || "-"} />
              <SummaryRow
                label="Chart context"
                value={
                  imageDataUrl || (inputs.chartNote && inputs.chartNote.length > 20)
                    ? "Provided"
                    : "Missing"
                }
              />
            </div>

            <div>
              <label className="text-xs text-muted">Optional question for the model</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder="Optional: Ask for a focused angle in the plan output"
                className="mt-1 w-full rounded border border-border bg-bg p-3 text-sm"
              />
            </div>

            {missing.length > 0 && (
              <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
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

        <div className="mt-4 flex gap-2">
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
        <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
          {planError}
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
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs uppercase text-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}
