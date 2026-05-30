"use client";

import { useMemo, useRef, useState } from "react";
import { validateInputs, type PlanInputs } from "@/lib/validation";
import PlanView from "@/components/PlanView";
import type { Plan } from "@/lib/plan/schema";

type Msg = { role: "user" | "assistant"; content: string };

const HOLDING_PERIODS = ["Scalp", "Day", "Swing", "Position"] as const;

export default function Chat() {
  const [inputs, setInputs] = useState<PlanInputs>({
    ticker: "",
    timeframe: "",
    holdingPeriod: "",
    riskPercent: "",
    chartNote: "",
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [structuredPlan, setStructuredPlan] = useState<{ id: string; plan: Plan } | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const missing = useMemo(
    () => validateInputs({ ...inputs, hasImage: !!imageDataUrl }),
    [inputs, imageDataUrl]
  );
  const ready = missing.length === 0;

  async function handleFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      alert("Image too big. Keep it under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function send() {
    if (!draft.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: draft.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          inputs,
          imageDataUrl,
        }),
      });
      if (!res.ok || !res.body) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${res.status}` },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } finally {
      setBusy(false);
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
          inputs,
          imageDataUrl,
          userQuestion: draft.trim() || undefined,
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

      // 503 means plan generated but save failed — show it anyway.
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
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* Input gating panel */}
      <aside className="rounded border border-border bg-panel p-4">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
          Required inputs
        </h2>
        <div className="space-y-3">
          <Field
            label="1. Ticker"
            placeholder="BTC/USD, NVDA, EUR/USD"
            value={inputs.ticker ?? ""}
            onChange={(v) => setInputs({ ...inputs, ticker: v.toUpperCase() })}
            invalid={missing.includes("ticker")}
          />
          <Field
            label="2. Timeframe"
            placeholder="1m, 5m, 1H, 4H, daily"
            value={inputs.timeframe ?? ""}
            onChange={(v) => setInputs({ ...inputs, timeframe: v })}
            invalid={missing.includes("timeframe")}
          />
          <div>
            <label className="mb-1 block text-xs text-muted">3. Holding period</label>
            <div className="flex flex-wrap gap-1">
              {HOLDING_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInputs({ ...inputs, holdingPeriod: p })}
                  className={`rounded border px-2 py-1 text-xs ${
                    inputs.holdingPeriod === p
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-ink hover:border-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {missing.includes("holdingPeriod") && (
              <p className="mt-1 text-[10px] text-danger">required</p>
            )}
          </div>
          <Field
            label="4. Risk per trade"
            placeholder="0.5%, 1%, 2%"
            value={inputs.riskPercent ?? ""}
            onChange={(v) => setInputs({ ...inputs, riskPercent: v })}
            invalid={missing.includes("riskPercent")}
          />
          <div>
            <label className="mb-1 block text-xs text-muted">
              5. Chart (image and/or written description)
            </label>
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
                {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL, not a remote/static asset */}
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
            <textarea
              placeholder="Levels, trend, volume, structure, potential entry/exit…"
              value={inputs.chartNote ?? ""}
              onChange={(e) =>
                setInputs({ ...inputs, chartNote: e.target.value })
              }
              rows={3}
              className={`mt-2 w-full rounded border bg-bg p-2 text-xs ${
                missing.includes("chart") ? "border-danger" : "border-border"
              }`}
            />
          </div>
        </div>

        <div
          className={`mt-4 rounded border p-2 text-xs ${
            ready
              ? "border-accent/40 bg-accent/5 text-accent"
              : "border-border text-muted"
          }`}
        >
          {ready
            ? "Inputs complete. Ask for a plan."
            : `Still missing: ${missing.length}`}
        </div>

        <button
          type="button"
          onClick={buildStructuredPlan}
          disabled={!ready || planBusy}
          className="mt-3 w-full rounded bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {planBusy ? "Building plan…" : "Build structured plan"}
        </button>
        <p className="mt-1 text-[10px] text-muted">
          Generates the seven-section plan and saves it to your journal.
        </p>
      </aside>

      {/* Chat */}
      <section className="flex min-h-[60vh] flex-col rounded border border-border bg-panel">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && !structuredPlan && (
            <EmptyState ready={ready} />
          )}
          {planError && (
            <div className="rounded border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
              {planError}
            </div>
          )}
          {structuredPlan && (
            <div className="rounded border border-accent/30 bg-bg p-3">
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
            </div>
          )}
          {messages.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))}
          {busy && <p className="text-xs text-muted">thinking…</p>}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder='Try: "Build the plan." (or ask a specific question)'
              className="flex-1 resize-none rounded border border-border bg-bg p-2 text-sm"
            />
            <button
              onClick={send}
              disabled={busy || !draft.trim()}
              className="rounded bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Enter = send · Shift+Enter = newline
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  invalid,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded border bg-bg p-2 text-sm ${
          invalid ? "border-danger" : "border-border"
        }`}
      />
    </div>
  );
}

function Message({ role, content }: Msg) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded border px-3 py-2 text-sm ${
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

function EmptyState({ ready }: { ready: boolean }) {
  return (
    <div className="rounded border border-dashed border-border p-4 text-sm text-muted">
      <p className="mb-2">
        Fill the five required inputs on the left, then ask for a plan.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-xs">
        <li>Asset ticker (BTC/USD, NVDA, SPY…)</li>
        <li>Chart timeframe (1m, 5m, 1H, 4H, daily…)</li>
        <li>Holding period (Scalp / Day / Swing / Position)</li>
        <li>Risk per trade (e.g., 1%)</li>
        <li>Chart screenshot and/or written description</li>
      </ul>
      <p className="mt-3 text-xs">
        {ready
          ? 'Ready. Try: "Build the plan."'
          : "Vague inputs get vague answers. Fill the panel first."}
      </p>
    </div>
  );
}
