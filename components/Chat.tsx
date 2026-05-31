"use client";

import { useMemo, useRef, useState } from "react";
import {
  MIN_CHART_NOTE_CHARS,
  validateInputs,
  type MissingField,
  type PlanInputs,
} from "@/lib/validation";
import PlanView from "@/components/PlanView";
import type { Plan } from "@/lib/plan/schema";

type Msg = { role: "user" | "assistant"; content: string };

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
    text: "NVDA daily chart, position idea, risk 0.5%. Price broke above a prior resistance area and is retesting it. I want a plan that separates a healthy retest from a failed breakout.",
  },
  {
    label: "Range patience",
    text: "SPY 1H, day trade, risk 0.5%. Price is in the middle of a range between support and resistance. I am not sure if there is enough edge yet, so help me define what evidence would matter.",
  },
] as const;

const CHART_EXAMPLES = [
  "Trend: higher highs/lows or lower highs/lows",
  "Levels: support, resistance, range edge, prior high/low",
  "Now: testing, rejecting, consolidating, retesting",
  "Invalidation: what would prove the read wrong",
] as const;

const EXPLORE_TIMEFRAMES = ["15m", "1H", "4H", "1D"] as const;
const EXPLORE_STYLES = ["Unsure", "Day", "Swing", "Position"] as const;

const FIELD_LABELS: Record<MissingField, string> = {
  ticker: "asset",
  timeframe: "timeframe",
  holdingPeriod: "holding period",
  riskPercent: "risk",
  chart: "chart context",
};

export default function Chat() {
  const [inputs, setInputs] = useState<PlanInputs>({
    ticker: "",
    timeframe: "",
    holdingPeriod: "",
    riskPercent: "",
    chartNote: "",
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Write the setup in plain English. I will pull out the asset, timeframe, holding period, risk, and chart context before building the structured plan.",
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
  const fileRef = useRef<HTMLInputElement>(null);

  const missing = useMemo(
    () => validateInputs({ ...inputs, hasImage: !!imageDataUrl }),
    [inputs, imageDataUrl]
  );
  const ready = missing.length === 0;
  const chartChars = inputs.chartNote?.trim().length ?? 0;

  function updateInputs(next: Partial<PlanInputs>) {
    setInputs((current) => ({ ...current, ...next }));
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
          inputs,
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
          riskPercent: data.inputs.riskPercent ?? "",
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
          riskPercent: inputs.riskPercent || "1%",
          style: exploreStyle,
          useFoxClaw: true,
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
    updateInputs({
      ticker: candidate.planSeed.ticker,
      timeframe: candidate.planSeed.timeframe,
      holdingPeriod: candidate.planSeed.holdingPeriod,
      riskPercent: candidate.planSeed.riskPercent,
      chartNote: candidate.planSeed.chartNote,
    });
    setQuestion(
      `Pressure-test the ${candidate.label.toLowerCase()} angle. What confirmation, invalidation, and patience rules matter most?`
    );
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `Loaded "${candidate.label}" into the plan fields. Read the chart context on the right, edit anything you disagree with, then build the structured plan.`,
      },
    ]);
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
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-[68vh] flex-col rounded border border-border bg-panel">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-medium">Plain-English plan builder</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Describe what you see like you would to a trading buddy. Planifier will
            translate it into structured fields before generating anything.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
            <div className="rounded border border-accent/30 bg-bg p-3">
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
              className="min-h-[96px] flex-1 resize-none rounded border border-border bg-bg p-3 text-sm leading-relaxed"
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

      <aside className="space-y-4">
        <section className="rounded border border-border bg-panel p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Start with a pair
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            No setup yet? Pick a pair and Planifier will look for a few
            educational angles to start from.
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
            {exploreBusy ? "Finding angles..." : "Find starting angles"}
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

              {exploreResult.newsSnapshot && (
                <div className="rounded border border-border bg-bg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Current context
                    </h3>
                    <span className="text-[10px] text-muted">
                      {formatTimestamp(exploreResult.newsSnapshot.generatedAt)}
                    </span>
                  </div>
                  {exploreResult.newsSnapshot.articles.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {exploreResult.newsSnapshot.articles.slice(0, 4).map((article) => (
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
                </div>
              )}

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
            </div>
          )}
        </section>

        <section className="rounded border border-border bg-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
              What I understand
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
            <InputRow
              label="Risk"
              value={inputs.riskPercent}
              missing={missing.includes("riskPercent")}
              placeholder="1%"
            />
          </div>

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
            <textarea
              value={inputs.chartNote ?? ""}
              onChange={(e) => updateInputs({ chartNote: e.target.value })}
              rows={6}
              placeholder="Trend, levels, current behavior, and invalidation."
              className={`w-full rounded border bg-bg p-2 text-xs leading-relaxed ${
                missing.includes("chart") ? "border-danger" : "border-border"
              }`}
            />
            <p className="mt-1 text-[10px] text-muted">
              {imageDataUrl
                ? "Image uploaded. Notes are still useful."
                : `${chartChars}/${MIN_CHART_NOTE_CHARS} useful characters minimum.`}
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
              Need: {missing.map((item) => FIELD_LABELS[item]).join(", ")}.
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

        <section className="rounded border border-border bg-panel p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Chart examples
          </h2>
          <div className="mt-3 space-y-2">
            {CHART_EXAMPLES.map((example) => (
              <p key={example} className="rounded border border-border bg-bg p-2 text-xs leading-relaxed text-muted">
                {example}
              </p>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

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
