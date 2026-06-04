"use client";

import { useMemo, useRef, useState } from "react";
import {
  MIN_CHART_NOTE_CHARS,
  validateInputs,
  type MissingField,
  type PlanInputs,
} from "@/lib/validation";
import PlanView from "@/components/PlanView";
import ScenarioChart from "@/components/ScenarioChart";
import type { Plan } from "@/lib/plan/schema";
import {
  appendChartContextPrompt,
  CHART_CONTEXT_PROMPTS,
} from "@/lib/plan/chartContext";
import type { HistoricalScenarioMap } from "@/lib/plan/historicalScenarios";
import { FIXED_RISK_PERCENT } from "@/lib/plan/risk";
import {
  getBeginnerWalkthroughSteps,
  type BeginnerWalkthroughStep,
} from "@/lib/plan/beginnerWalkthrough";

type Msg = { role: "user" | "assistant"; content: string };
type LearningMode = "standard" | "beginner";

type IntakeResponse = {
  inputs: PlanInputs;
  missing: MissingField[];
  mismatch?: string | null;
  userQuestion?: string | null;
  assistantMessage: string;
  confidence?: "low" | "medium" | "high";
};

type ExploreCandidate = {
  label: string;
  bias: "long" | "short" | "neutral";
  thesis: string;
  whatToWaitFor: string[];
  invalidation: string[];
  riskNotes: string[];
  chartContext: string;
  confidence: "low" | "medium" | "high";
  planSeed: Required<Pick<PlanInputs, "ticker" | "timeframe" | "riskPercent" | "chartNote">> & {
    holdingPeriod: Exclude<PlanInputs["holdingPeriod"], "" | undefined>;
  };
};

type ExploreResponse = {
  overview: string;
  dataNotes: string[];
  candidates: ExploreCandidate[];
  newsSnapshot?: {
    generatedAt: string;
    queryTerms: string[];
    articles: Array<{
      title: string;
      url: string;
      source: string;
      publishedAt: string | null;
      matchedTerms: string[];
    }>;
    sourceNotes: string[];
  };
  marketError?: string | null;
  foxClaw?: {
    available: boolean;
    authority: "context_only";
    relayStatus?: string;
    liveAuthorityLocked?: boolean;
    note: string;
  } | null;
};

const STARTER_PROMPTS = [
  {
    label: "Plain BTC setup",
    text: "BTC/USD on the 4H, swing idea, risk 1%. Price is pulling back toward prior support after higher lows. I want to know if this is a patient continuation setup or if the trend is weakening.",
  },
  {
    label: "Breakout retest",
    text: "NVDA daily chart, position idea, risk 1%. Price broke above a prior resistance area and is retesting it. I want a plan that separates a healthy retest from a failed breakout.",
  },
  {
    label: "Range patience",
    text: "SPY 1H, day trade, risk 1%. Price is in the middle of a range between support and resistance. I am not sure if there is enough edge yet, so help me define what evidence would matter.",
  },
] as const;

const CHART_EXAMPLES = [
  "Trend: higher highs/lows, lower highs/lows, or sideways",
  "Level: support, resistance, range edge, prior high/low",
  "Now: testing, rejecting, consolidating, retesting",
  "Wrong if: what would prove the read wrong",
] as const;

const EXPLORE_TIMEFRAMES = ["15m", "1H", "4H", "1D"] as const;
const EXPLORE_STYLES = ["Unsure", "Scalp", "Day", "Swing", "Position"] as const;
const LEARNING_MODES: Array<{ value: LearningMode; label: string }> = [
  { value: "beginner", label: "Still learning" },
  { value: "standard", label: "Standard" },
];

const BEGINNER_FIELD_HELP = [
  {
    term: "Asset",
    help: "The thing you are looking at, like BTC/USD, SPY, or NVDA.",
  },
  {
    term: "Timeframe",
    help: "How much time one candle covers. A 4H candle shows four hours of movement.",
  },
  {
    term: "Confirmation",
    help: "A clue you wait for before trusting the idea more.",
  },
  {
    term: "Invalidation",
    help: "The line where the idea is wrong and you stop practicing it.",
  },
  {
    term: "Risk",
    help: `Locked at ${FIXED_RISK_PERCENT}. The app keeps the practice loss limit the same every time.`,
  },
] as const;

const FIELD_LABELS: Record<MissingField, string> = {
  ticker: "asset",
  timeframe: "timeframe",
  holdingPeriod: "holding period",
  riskPercent: "fixed 1% risk",
  chart: "chart context",
};

const BEGINNER_CONTEXT_EXAMPLE =
  "Example: Trend is making higher lows. Key level is prior 4H support. Price is pulling back into that level now. Wrong if price closes below the support zone.";

export default function Chat() {
  const [inputs, setInputs] = useState<PlanInputs>({
    ticker: "",
    timeframe: "",
    holdingPeriod: "",
    riskPercent: FIXED_RISK_PERCENT,
    chartNote: "",
  });
  const [learningMode, setLearningMode] = useState<LearningMode>("beginner");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        `Write the setup in plain English. I will pull out the asset, timeframe, holding period, and chart context. Risk stays fixed at ${FIXED_RISK_PERCENT}.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [structuredPlan, setStructuredPlan] = useState<{ id: string; plan: Plan } | null>(
    null
  );
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [explorePair, setExplorePair] = useState("BTC/USD");
  const [exploreTimeframe, setExploreTimeframe] = useState("4H");
  const [exploreStyle, setExploreStyle] = useState<
    (typeof EXPLORE_STYLES)[number]
  >("Unsure");
  const [exploreBusy, setExploreBusy] = useState(false);
  const [exploreResult, setExploreResult] = useState<ExploreResponse | null>(null);
  const [historicalScenario, setHistoricalScenario] =
    useState<HistoricalScenarioMap | null>(null);
  const [historicalBusy, setHistoricalBusy] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [selectedAngleLabel, setSelectedAngleLabel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const buildRef = useRef<HTMLElement | null>(null);
  const startHereRef = useRef<HTMLElement | null>(null);
  const planResultRef = useRef<HTMLDivElement | null>(null);

  const missing = useMemo(
    () => validateInputs({ ...inputs, hasImage: !!imageDataUrl }),
    [inputs, imageDataUrl]
  );
  const ready = missing.length === 0;
  const chartChars = inputs.chartNote?.trim().length ?? 0;
  const missingLabels = missing.map((item) => FIELD_LABELS[item]);
  const beginnerWalkthroughSteps = useMemo(
    () =>
      getBeginnerWalkthroughSteps({
        hasMarketContext: Boolean(explorePair.trim() && exploreTimeframe),
        hasStartingAngles: !!exploreResult,
        hasSelectedAngle: !!selectedAngleLabel,
        fieldsReady: ready,
        hasPlan: !!structuredPlan,
        hasSavedPlan: !!structuredPlan?.id,
      }),
    [
      explorePair,
      exploreTimeframe,
      exploreResult,
      selectedAngleLabel,
      ready,
      structuredPlan,
    ]
  );

  function updateInputs(next: Partial<PlanInputs>) {
    setInputs((current) => ({
      ...current,
      ...next,
      riskPercent: FIXED_RISK_PERCENT,
    }));
    setPlanError(null);
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

  async function send(messageOverride?: string) {
    const text = (messageOverride ?? draft).trim();
    if (!text || busy) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((current) => [...current, userMsg]);
    setDraft("");
    setBusy(true);
    setPlanError(null);

    try {
      const res = await fetch("/api/plan/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          inputs: { ...inputs, riskPercent: FIXED_RISK_PERCENT },
          imageDataUrl,
        }),
      });

      const data = (await res.json()) as Partial<IntakeResponse> & {
        message?: string;
      };
      if (!res.ok) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.message ?? "I could not read that setup. Try again in one or two plain sentences.",
          },
        ]);
        return;
      }

      if (data.inputs) {
        setInputs({
          ticker: data.inputs.ticker ?? "",
          timeframe: data.inputs.timeframe ?? "",
          holdingPeriod: normalizeHoldingPeriod(data.inputs.holdingPeriod),
          riskPercent: FIXED_RISK_PERCENT,
          chartNote: data.inputs.chartNote ?? "",
        });
      }
      if (data.userQuestion) setQuestion(data.userQuestion);
      setMismatch(data.mismatch ?? null);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.assistantMessage ??
            "I updated the plan fields. Check what I captured, then add anything missing.",
        },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Something broke while reading that setup. Try a shorter version, then we can build from there.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function exploreStartingAngles() {
    const pair = explorePair.trim().toUpperCase();
    if (!pair || exploreBusy) return;
    setExploreBusy(true);
    setPlanError(null);
    setExploreResult(null);
    setSelectedAngleLabel(null);
    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: `I do not know where to start. Find a few educational starting angles for ${pair} on ${exploreTimeframe}.`,
      },
    ]);

    try {
      const res = await fetch("/api/plan/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          timeframe: exploreTimeframe,
          riskPercent: FIXED_RISK_PERCENT,
          style: exploreStyle,
          useFoxClaw: true,
          learningMode,
        }),
      });
      const data = (await res.json()) as Partial<ExploreResponse> & {
        message?: string;
      };
      if (!res.ok || !data.candidates) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              data.message ??
              "I could not generate starting angles for that pair yet. Try BTC/USD or ETH/USD first.",
          },
        ]);
        return;
      }

      const result = data as ExploreResponse;
      setExploreResult(result);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            `${result.overview}\n\n` +
            "I found a few starting angles in the panel. Pick one to load it into the plan fields, then edit anything that feels wrong.",
        },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Something broke while looking for starting angles. Try a major crypto pair like BTC/USD or ETH/USD.",
        },
      ]);
    } finally {
      setExploreBusy(false);
    }
  }

  function applyExploreCandidate(candidate: ExploreCandidate) {
    setSelectedAngleLabel(candidate.label);
    setExplorePair(candidate.planSeed.ticker);
    setExploreTimeframe(candidate.planSeed.timeframe);
    setExploreStyle(candidate.planSeed.holdingPeriod);
    updateInputs({
      ticker: candidate.planSeed.ticker,
      timeframe: candidate.planSeed.timeframe,
      holdingPeriod: candidate.planSeed.holdingPeriod,
      riskPercent: FIXED_RISK_PERCENT,
      chartNote: candidate.planSeed.chartNote,
    });
    setQuestion(
      `Pressure-test the ${candidate.label.toLowerCase()} angle. What confirmation, invalidation, and patience rules matter most?`
    );
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `Loaded "${candidate.label}" into the plan fields. Next: use the Ready to build button above, or review the fields on the right before building.`,
      },
    ]);
    window.setTimeout(() => {
      buildRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function applyScenarioNote(note: string) {
    updateInputs({
      chartNote: appendChartContextPrompt(inputs.chartNote, note),
    });
    setQuestion(
      "Map the likely paths before they happen. What confirms the idea, what kills it, and when should I stand aside?"
    );
    window.setTimeout(() => {
      buildRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function generateHistoricalScenarioMap() {
    const pair = explorePair.trim().toUpperCase();
    if (!pair || historicalBusy) return;
    setHistoricalBusy(true);
    setHistoricalError(null);

    try {
      const res = await fetch("/api/plan/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          timeframe: exploreTimeframe,
          holdingPeriod: normalizeScenarioHolding(
            exploreStyle,
            inputs.holdingPeriod
          ),
        }),
      });
      const data = (await res.json()) as {
        scenario?: HistoricalScenarioMap;
        message?: string;
      };
      if (!res.ok || !data.scenario) {
        setHistoricalError(
          data.message ??
            "Historical scenario mapping is not available for that pair yet."
        );
        return;
      }
      const scenario = data.scenario;
      setHistoricalScenario(scenario);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            `Mapped ${scenario.evidence.historicalSampleCount} similar historical episodes for ${pair} on ${exploreTimeframe}. ` +
            "Use the scenario map to pre-plan confirmation, failure, and stand-aside paths.",
        },
      ]);
    } catch (e) {
      console.error(e);
      setHistoricalError(
        "Something broke while mapping history. The practice examples still work."
      );
    } finally {
      setHistoricalBusy(false);
    }
  }

  async function buildStructuredPlan() {
    if (!ready || planBusy) return;
    setPlanBusy(true);
    setPlanError(null);
    setStructuredPlan(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: { ...inputs, riskPercent: FIXED_RISK_PERCENT },
          imageDataUrl,
          userQuestion: question.trim() || undefined,
          learningMode,
        }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const data: unknown = ct.includes("application/json")
        ? await res.json()
        : { code: "UNKNOWN", message: await res.text() };

      if (res.ok) {
        const ok = data as { id: string; plan: Plan };
        setStructuredPlan(ok);
        window.setTimeout(() => {
          planResultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
        return;
      }

      const errBody = data as {
        code?: string;
        message?: string;
        plan?: Plan;
      };
      if (res.status === 503 && errBody.plan) {
        setStructuredPlan({ id: "", plan: errBody.plan });
        window.setTimeout(() => {
          planResultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
      setPlanError(
        errBody.message ??
          "Something broke while building the plan. Try again, and if it repeats, check the deployment logs."
      );
    } catch (e) {
      console.error(e);
      setPlanError(
        "Something broke while building the plan. Try again, and if it repeats, check the deployment logs."
      );
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
      <section className="surface-panel flex flex-col rounded border border-border bg-panel xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)]">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-medium">Plain-English plan builder</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Describe what you see like you would to a trading buddy. Planifier will
            translate it into structured fields before generating anything.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Learning level
            </span>
            <div className="grid grid-cols-2 gap-1 rounded border border-border bg-bg p-1 sm:w-[260px]">
              {LEARNING_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={learningMode === mode.value}
                  onClick={() => setLearningMode(mode.value)}
                  className={`rounded px-2 py-2 text-xs ${
                    learningMode === mode.value
                      ? "bg-accent text-bg"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <BuilderStatus
            ready={ready}
            hasPlan={!!structuredPlan}
            planBusy={planBusy}
            missingLabels={missingLabels}
            onBuild={buildStructuredPlan}
            onReview={() =>
              buildRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />
        </div>

        <div className="max-h-[420px] min-h-[220px] space-y-3 overflow-y-auto p-4 xl:max-h-[38vh]">
          {messages.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))}
          {busy && <p className="text-xs text-muted">Reading the setup...</p>}
          {planError && (
            <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
              {planError}
            </div>
          )}
          {structuredPlan && (
            <div ref={planResultRef} className="rounded border border-accent/30 bg-bg p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase text-muted">
                  structured plan
                </span>
                <button
                  type="button"
                  onClick={() => setStructuredPlan(null)}
                  className="text-[10px] text-muted underline"
                >
                  clear
                </button>
              </div>
              <PlanView plan={structuredPlan.plan} planId={structuredPlan.id} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {STARTER_PROMPTS.map((starter) => (
              <button
                key={starter.label}
                type="button"
                onClick={() => setDraft(starter.text)}
                className="rounded border border-border px-3 py-2 text-left text-xs text-ink hover:border-muted"
              >
                {starter.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={3}
              placeholder="Example: BTC 4H swing, risk 1%. Pulling back into prior support after higher lows. I am unsure if this is continuation or weakness."
              className="min-h-[72px] flex-1 resize-none rounded border border-border bg-bg p-3 text-sm leading-relaxed"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={busy || !draft.trim()}
              className="rounded bg-accent px-4 py-3 text-sm font-medium text-bg disabled:opacity-40 sm:w-24"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Enter = send. Shift+Enter = newline.
          </p>
        </div>
      </section>

      <aside className="space-y-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
        {learningMode === "beginner" && (
          <BeginnerWalkthrough
            steps={beginnerWalkthroughSteps}
            pair={explorePair}
            timeframe={exploreTimeframe}
            style={exploreStyle}
            selectedAngleLabel={selectedAngleLabel}
            ready={ready}
            hasPlan={!!structuredPlan}
            planId={structuredPlan?.id ?? ""}
            planBusy={planBusy}
            exploreBusy={exploreBusy}
            onStart={() =>
              startHereRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            onFindAngles={exploreStartingAngles}
            onReviewFields={() =>
              buildRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            onBuild={buildStructuredPlan}
            onReviewPlan={() =>
              planResultRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />
        )}

        <section ref={startHereRef} className="surface-panel rounded border border-border bg-panel p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Step 1: find a starting angle
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Pick a market and timeframe. Planifier will suggest educational
            practice angles, then you choose one and turn it into a checklist.
          </p>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted">Pair</label>
            <input
              value={explorePair}
              onChange={(e) => setExplorePair(e.target.value.toUpperCase())}
              placeholder="BTC/USD"
              className="w-full rounded border border-border bg-bg p-2 text-sm"
            />
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs text-muted">Timeframe</span>
            <div className="grid grid-cols-4 gap-1">
              {EXPLORE_TIMEFRAMES.map((timeframe) => (
                <button
                  key={timeframe}
                  type="button"
                  onClick={() => setExploreTimeframe(timeframe)}
                  className={`rounded border px-2 py-2 text-xs ${
                    exploreTimeframe === timeframe
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-ink hover:border-muted"
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs text-muted">Style</span>
            <div className="grid grid-cols-2 gap-1">
              {EXPLORE_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setExploreStyle(style)}
                  className={`rounded border px-2 py-2 text-xs ${
                    exploreStyle === style
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-ink hover:border-muted"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={exploreStartingAngles}
            disabled={exploreBusy || !explorePair.trim()}
            className="mt-3 w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg disabled:opacity-40"
          >
            {exploreBusy ? "Finding angles..." : "Find beginner starting angles"}
          </button>

          {exploreResult && (
            <div className="mt-4 space-y-3">
              <div className="rounded border border-border bg-bg p-3 text-xs leading-relaxed text-muted">
                <p>{exploreResult.overview}</p>
                {exploreResult.foxClaw && (
                  <p className="mt-2">
                    FoxClaw:{" "}
                    {exploreResult.foxClaw.available
                      ? `context-only, relay ${exploreResult.foxClaw.relayStatus ?? "unknown"}`
                      : "not available here"}
                    .
                  </p>
                )}
              </div>

              {exploreResult.candidates.map((candidate) => (
                <article
                  key={candidate.label}
                  className="rounded border border-border bg-bg p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{candidate.label}</h3>
                    <span className="rounded border border-border px-2 py-1 text-[10px] uppercase text-muted">
                      {candidate.bias} / {candidate.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {candidate.thesis}
                  </p>
                  <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
                    <p>
                      <span className="text-ink">Wait for:</span>{" "}
                      {candidate.whatToWaitFor.slice(0, 2).join("; ")}
                    </p>
                    <p>
                      <span className="text-ink">Invalid if:</span>{" "}
                      {candidate.invalidation.slice(0, 2).join("; ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyExploreCandidate(candidate)}
                    className="mt-3 w-full rounded border border-accent/50 px-3 py-2 text-left text-xs text-accent"
                  >
                    Use this as the starting plan
                  </button>
                </article>
              ))}

              {exploreResult.newsSnapshot && (
                <details className="rounded border border-border bg-bg p-3">
                  <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-wider text-muted">
                    Current context / {formatTimestamp(exploreResult.newsSnapshot.generatedAt)}
                  </summary>
                  {exploreResult.newsSnapshot.articles.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {exploreResult.newsSnapshot.articles.slice(0, 2).map((article) => (
                        <a
                          key={article.url}
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded border border-border px-2 py-2 text-xs leading-relaxed text-ink hover:border-muted"
                        >
                          <span className="block">{article.title}</span>
                          <span className="mt-1 block text-[10px] text-muted">
                            {article.source}
                            {article.publishedAt
                              ? ` / ${formatTimestamp(article.publishedAt)}`
                              : ""}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      No matching headlines found in the checked RSS sources.
                    </p>
                  )}
                </details>
              )}
            </div>
          )}
        </section>

        <ScenarioChart
          historicalScenario={historicalScenario}
          historicalBusy={historicalBusy}
          historicalError={historicalError}
          onRequestHistorical={generateHistoricalScenarioMap}
          onUseScenario={applyScenarioNote}
        />

        <section ref={buildRef} className="surface-panel rounded border border-border bg-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
              Step 3: build the plan
            </h2>
            <span
              className={`rounded border px-2 py-1 text-[10px] ${
                ready
                  ? "border-accent/40 text-accent"
                  : "border-border text-muted"
              }`}
            >
              {ready ? "ready" : `${missing.length} missing`}
            </span>
          </div>

          <div className="space-y-2">
            <InputRow
              label="Asset"
              value={inputs.ticker}
              missing={missing.includes("ticker")}
              placeholder="BTC/USD"
            />
            <InputRow
              label="Timeframe"
              value={inputs.timeframe}
              missing={missing.includes("timeframe")}
              placeholder="4H"
            />
            <HoldingPeriodPicker value={inputs.holdingPeriod} onPick={updateInputs} />
            <FixedRiskRow missing={missing.includes("riskPercent")} />
          </div>

          {learningMode === "beginner" && (
            <div className="mt-3 rounded border border-border bg-bg p-3">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Still learning
              </h3>
              <div className="mt-2 space-y-2">
                {BEGINNER_FIELD_HELP.map((item) => (
                  <p key={item.term} className="text-xs leading-relaxed text-muted">
                    <span className="text-ink">{item.term}:</span> {item.help}
                  </p>
                ))}
              </div>
              <div className="mt-3 rounded border border-border/70 p-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  chart note pattern
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {BEGINNER_CONTEXT_EXAMPLE}
                </p>
              </div>
            </div>
          )}

          {mismatch && (
            <div className="mt-3 rounded border border-danger/50 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
              {mismatch}
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-xs text-muted">Chart screenshot</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Upload chart screenshot"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-border file:px-2 file:py-1 file:text-ink hover:file:bg-muted"
            />
            {imageDataUrl && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL */}
                <img
                  src={imageDataUrl}
                  alt="chart"
                  className="h-16 w-auto rounded border border-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageDataUrl(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-[10px] text-muted underline"
                >
                  remove
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs text-muted">Chart context</label>
            {learningMode === "beginner" && (
              <div className="mb-2 grid grid-cols-2 gap-1">
                {CHART_CONTEXT_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() =>
                      updateInputs({
                        chartNote: appendChartContextPrompt(
                          inputs.chartNote,
                          item.prompt
                        ),
                      })
                    }
                    className="rounded border border-border px-2 py-2 text-left text-[11px] text-muted hover:border-muted hover:text-ink"
                  >
                    Add {item.label.toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={inputs.chartNote ?? ""}
              onChange={(e) => updateInputs({ chartNote: e.target.value })}
              rows={6}
              placeholder="Answer in pieces: trend, key level, what price is doing now, and what would prove the idea wrong."
              className={`w-full rounded border bg-bg p-2 text-xs leading-relaxed ${
                missing.includes("chart") ? "border-danger" : "border-border"
              }`}
            />
            <p className="mt-1 text-[10px] text-muted">
              {imageDataUrl
                ? "Image uploaded. Notes are still useful."
                : `${chartChars}/${MIN_CHART_NOTE_CHARS} useful characters minimum. Name a trend, level, current behavior, and wrong-if condition.`}
            </p>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs text-muted">Focus question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="Optional: what should the plan pay attention to?"
              className="w-full rounded border border-border bg-bg p-2 text-xs leading-relaxed"
            />
          </div>

          {missing.length > 0 && (
            <div className="mt-3 rounded border border-border p-3 text-xs leading-relaxed text-muted">
              Next: add {missingLabels.join(", ")}.
            </div>
          )}

          <button
            type="button"
            onClick={buildStructuredPlan}
            disabled={!ready || planBusy}
            className="mt-3 w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg disabled:opacity-40"
          >
            {planBusy ? "Building plan..." : "Build structured plan"}
          </button>
        </section>

        <section className="surface-panel rounded border border-border bg-panel p-4">
          <details>
            <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-wider text-muted">
              Chart examples
            </summary>
            <div className="mt-3 space-y-2">
              {CHART_EXAMPLES.map((example) => (
                <p
                  key={example}
                  className="rounded border border-border bg-bg p-2 text-xs leading-relaxed text-muted"
                >
                  {example}
                </p>
              ))}
            </div>
          </details>
        </section>
      </aside>
    </div>
  );
}

function BuilderStatus({
  ready,
  hasPlan,
  planBusy,
  missingLabels,
  onBuild,
  onReview,
}: {
  ready: boolean;
  hasPlan: boolean;
  planBusy: boolean;
  missingLabels: string[];
  onBuild: () => void;
  onReview: () => void;
}) {
  const stepText = hasPlan
    ? "Plan built. Review it below, then save or journal from the plan view."
    : ready
      ? "Ready to build. The app has the asset, timeframe, style, fixed risk, and chart context."
      : `Next: add ${missingLabels.join(", ")}.`;

  return (
    <div className="mt-3 rounded border border-border bg-bg p-3">
      <div className="grid grid-cols-3 gap-1 text-[10px] uppercase tracking-wider text-muted">
        <span className="rounded border border-border px-2 py-1">1. Describe</span>
        <span className="rounded border border-border px-2 py-1">2. Check</span>
        <span
          className={`rounded border px-2 py-1 ${
            ready || hasPlan ? "border-accent/50 text-accent" : "border-border"
          }`}
        >
          3. Build
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted">{stepText}</p>
        {hasPlan ? (
          <button
            type="button"
            onClick={onReview}
            className="shrink-0 rounded border border-border px-3 py-2 text-xs text-ink hover:border-muted"
          >
            Review plan
          </button>
        ) : ready ? (
          <button
            type="button"
            onClick={onBuild}
            disabled={planBusy}
            className="shrink-0 rounded bg-accent px-3 py-2 text-xs font-medium text-bg disabled:opacity-40"
          >
            {planBusy ? "Building..." : "Build now"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onReview}
            className="shrink-0 rounded border border-border px-3 py-2 text-xs text-ink hover:border-muted"
          >
            Review fields
          </button>
        )}
      </div>
    </div>
  );
}

function BeginnerWalkthrough({
  steps,
  pair,
  timeframe,
  style,
  selectedAngleLabel,
  ready,
  hasPlan,
  planId,
  planBusy,
  exploreBusy,
  onStart,
  onFindAngles,
  onReviewFields,
  onBuild,
  onReviewPlan,
}: {
  steps: BeginnerWalkthroughStep[];
  pair: string;
  timeframe: string;
  style: string;
  selectedAngleLabel: string | null;
  ready: boolean;
  hasPlan: boolean;
  planId: string;
  planBusy: boolean;
  exploreBusy: boolean;
  onStart: () => void;
  onFindAngles: () => void;
  onReviewFields: () => void;
  onBuild: () => void;
  onReviewPlan: () => void;
}) {
  const active = steps.find((step) => step.status === "active") ?? steps[0];

  return (
    <section className="surface-panel rounded border border-accent/40 bg-accent/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-accent">
            Beginner walkthrough
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Start with a chart, choose one practice angle, build a checklist,
            then journal what happened. This is paper-planning, not an order.
          </p>
        </div>
        <span className="rounded border border-accent/40 px-2 py-1 text-[10px] uppercase text-accent">
          fixed risk {FIXED_RISK_PERCENT}
        </span>
      </div>

      <div className="mt-3 rounded border border-border bg-bg p-3 text-xs leading-relaxed text-muted">
        <span className="text-ink">{pair || "Pick a market"}</span>
        {" / "}
        <span>{timeframe || "timeframe"}</span>
        {" / "}
        <span>{style}</span>
        {selectedAngleLabel && (
          <span className="block pt-1 text-accent">
            Loaded angle: {selectedAngleLabel}
          </span>
        )}
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const copy = BEGINNER_WALKTHROUGH_COPY[step.id];
          return (
            <li
              key={step.id}
              className={`grid grid-cols-[34px_minmax(0,1fr)] gap-2 rounded border p-2 ${
                step.status === "active"
                  ? "border-accent/60 bg-accent/10"
                  : step.status === "done"
                    ? "border-accent/30"
                    : "border-border"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded border text-[10px] ${
                  step.status === "done"
                    ? "border-accent text-accent"
                    : step.status === "active"
                      ? "border-accent bg-accent text-bg"
                      : "border-border text-muted"
                }`}
              >
                {step.status === "done" ? "OK" : index + 1}
              </span>
              <div>
                <div className="text-sm font-medium text-ink">{copy.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {copy.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3">{renderBeginnerWalkthroughAction()}</div>
    </section>
  );

  function renderBeginnerWalkthroughAction() {
    if (active.id === "choose-context") {
      return (
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded border border-border px-3 py-2 text-left text-xs text-ink hover:border-muted"
        >
          Choose market and timeframe
        </button>
      );
    }

    if (active.id === "find-angles") {
      return (
        <button
          type="button"
          onClick={onFindAngles}
          disabled={exploreBusy}
          className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {exploreBusy ? "Finding angles..." : "Find starting angles"}
        </button>
      );
    }

    if (active.id === "choose-angle") {
      return (
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded border border-accent/50 px-3 py-2 text-left text-xs text-accent"
        >
          Review the angles and load one
        </button>
      );
    }

    if (active.id === "complete-fields") {
      return (
        <button
          type="button"
          onClick={onReviewFields}
          className="w-full rounded border border-border px-3 py-2 text-left text-xs text-ink hover:border-muted"
        >
          Check the plan fields
        </button>
      );
    }

    if (active.id === "build-plan") {
      return (
        <button
          type="button"
          onClick={onBuild}
          disabled={!ready || planBusy}
          className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {planBusy ? "Building plan..." : "Build structured plan"}
        </button>
      );
    }

    if (planId) {
      return (
        <a
          href={`/plans/${planId}`}
          className="block w-full rounded border border-accent/50 px-3 py-2 text-center text-xs text-accent"
        >
          Open plan and journal
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={onReviewPlan}
        disabled={!hasPlan}
        className="w-full rounded border border-border px-3 py-2 text-left text-xs text-ink hover:border-muted disabled:opacity-40"
      >
        Review the plan
      </button>
    );
  }
}

const BEGINNER_WALKTHROUGH_COPY: Record<
  BeginnerWalkthroughStep["id"],
  { title: string; body: string }
> = {
  "choose-context": {
    title: "Pick the chart to practice",
    body: "Choose the market, timeframe, and style. Unsure is fine; the goal is to start from one real chart.",
  },
  "find-angles": {
    title: "Find possible starting angles",
    body: "Ask Planifier for educational angles. These are ideas to inspect, not signals to follow.",
  },
  "choose-angle": {
    title: "Load one angle",
    body: "Pick the angle that matches what you can actually see. Treat it as a draft that still needs proof.",
  },
  "complete-fields": {
    title: "Name confirmation and wrong-if",
    body: "Check the asset, timeframe, holding period, chart context, and what would prove the idea wrong.",
  },
  "build-plan": {
    title: "Build the structured plan",
    body: "Generate the checklist, invalidation, scenarios, and beginner translation before any paper entry.",
  },
  journal: {
    title: "Save, practice, then journal",
    body: "Open the saved plan and write what happened after the practice trade so the lesson is not lost.",
  },
};

function InputRow({
  label,
  value,
  missing,
  placeholder,
}: {
  label: string;
  value?: string;
  missing: boolean;
  placeholder: string;
}) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <span className="text-xs text-muted">{label}</span>
      <span
        className={`min-h-9 rounded border px-3 py-2 text-sm ${
          missing ? "border-danger/60 text-danger" : "border-border text-ink"
        }`}
      >
        {value || placeholder}
      </span>
    </div>
  );
}

function FixedRiskRow({ missing }: { missing: boolean }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <span className="text-xs text-muted">Risk</span>
      <span
        className={`min-h-9 rounded border px-3 py-2 text-sm ${
          missing ? "border-danger/60 text-danger" : "border-accent/50 text-accent"
        }`}
      >
        Fixed at {FIXED_RISK_PERCENT}
      </span>
    </div>
  );
}

function HoldingPeriodPicker({
  value,
  onPick,
}: {
  value: PlanInputs["holdingPeriod"];
  onPick: (next: Partial<PlanInputs>) => void;
}) {
  const values: Array<Exclude<PlanInputs["holdingPeriod"], "" | undefined>> = [
    "Scalp",
    "Day",
    "Swing",
    "Position",
  ];

  return (
    <div>
      <span className="mb-1 block text-xs text-muted">Holding</span>
      <div className="grid grid-cols-2 gap-1">
        {values.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onPick({ holdingPeriod: period })}
            className={`rounded border px-2 py-2 text-xs ${
              value === period
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-ink hover:border-muted"
            }`}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ role, content }: Msg) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded border px-3 py-2 text-sm ${
          isUser
            ? "border-border bg-bg text-ink"
            : "prose-planifier border-border bg-panel text-ink"
        }`}
      >
        <div className="mb-1 font-mono text-[10px] uppercase text-muted">
          {isUser ? "you" : "planifier"}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
      </div>
    </div>
  );
}

function normalizeHoldingPeriod(value: PlanInputs["holdingPeriod"]): PlanInputs["holdingPeriod"] {
  if (
    value === "Scalp" ||
    value === "Day" ||
    value === "Swing" ||
    value === "Position"
  ) {
    return value;
  }
  return "";
}

function normalizeScenarioHolding(
  style: (typeof EXPLORE_STYLES)[number],
  current: PlanInputs["holdingPeriod"]
): Exclude<PlanInputs["holdingPeriod"], "" | undefined> {
  if (
    style === "Scalp" ||
    style === "Day" ||
    style === "Swing" ||
    style === "Position"
  ) {
    return style;
  }
  if (
    current === "Scalp" ||
    current === "Day" ||
    current === "Swing" ||
    current === "Position"
  ) {
    return current;
  }
  return "Swing";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
