"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function JournalForm({
  planId,
  strategyRules,
}: {
  planId: string;
  strategyRules?: string[];
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [followed, setFollowed] = useState("");
  const [hit, setHit] = useState("");
  const [vsPlan, setVsPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);

  const storageKey = useMemo(
    () => `planifier_journal_draft_${planId}`,
    [planId]
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        outcome?: string;
        followed?: string;
        hit?: string;
        vsPlan?: string;
        notes?: string;
      };
      setOutcome(draft.outcome ?? "");
      setFollowed(draft.followed ?? "");
      setHit(draft.hit ?? "");
      setVsPlan(draft.vsPlan ?? "");
      setNotes(draft.notes ?? "");
    } catch {
      // Ignore malformed drafts and continue with clean state.
    }
  }, [storageKey]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          outcome,
          followed,
          hit,
          vsPlan,
          notes,
        })
      );
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [outcome, followed, hit, vsPlan, notes, storageKey]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: outcome || undefined,
          followedChecklist: followed || undefined,
          hitInvalidation: hit || undefined,
          vsPlan: vsPlan || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        setErr(await res.text());
        return;
      }
      setOutcome("");
      setFollowed("");
      setHit("");
      setVsPlan("");
      setNotes("");
      localStorage.removeItem(storageKey);
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <h4 className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Add journal entry
        </h4>
        <p className="mt-1 text-xs text-muted">
          Record what actually happened and whether you followed your own rules.
        </p>
      </div>

      <div className="rounded border border-border bg-bg p-3 text-xs text-muted">
        This is where the learning compounds. Be honest. The point is not to look smart — the point is to catch the pattern before it costs you again.
      </div>

      <div className="rounded border border-accent/50 bg-accent/10 p-3">
        <button
          type="button"
          onClick={() => setRulesOpen((v) => !v)}
          aria-expanded={rulesOpen}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="text-[11px] uppercase tracking-wide text-accent">
            Your Strategy Notes rules
          </div>
          <span className="text-xs text-muted" aria-hidden="true">
            {rulesOpen ? "Hide" : "Show"}
          </span>
        </button>
        {rulesOpen && (
          <div className="mt-2 text-xs text-ink">
            {strategyRules && strategyRules.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5">
                {strategyRules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                No Strategy Notes rules were saved for this plan.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          label="Outcome"
          value={outcome}
          onChange={setOutcome}
          options={["", "win", "loss", "scratch", "skipped"]}
        />
        <Select
          label="Followed checklist"
          value={followed}
          onChange={setFollowed}
          options={["", "yes", "partial", "no"]}
        />
        <Select
          label="Hit invalidation"
          value={hit}
          onChange={setHit}
          options={["", "yes", "no", "na"]}
        />
      </div>

      <div className="rounded border border-border bg-bg p-3 text-xs text-muted">
        <div className="font-mono text-[10px] uppercase tracking-wider">
          Reflection prompts
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Did I follow the plan?</li>
          <li>Did I follow my Strategy Notes rules?</li>
          <li>What changed after entry?</li>
          <li>Did I move invalidation?</li>
          <li>What did I learn for next time?</li>
        </ul>
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-muted">
          vs. plan
        </label>
        <input
          value={vsPlan}
          onChange={(e) => setVsPlan(e.target.value)}
          maxLength={500}
          placeholder="What did the plan say, and what actually happened?"
          className="w-full rounded border border-border bg-bg p-3 text-sm"
        />
        <div className="mt-1 text-right text-[11px] text-muted">
          {vsPlan.length}/500
        </div>
      </div>

      <textarea
        placeholder="Did you follow the plan? Did you follow your Strategy Notes rules? What changed? Did you move invalidation? What did you learn?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        maxLength={4000}
        className="w-full rounded border border-border bg-bg p-3 text-sm"
      />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{notes.length}/4000</span>
        {saved && <span className="text-accent">Saved.</span>}
      </div>

      {err && (
        <p className="rounded border border-danger/50 bg-danger/10 p-2 text-xs text-danger">
          {err}
        </p>
      )}

      <div className="sticky bottom-0 -mx-3 border-t border-border bg-panel/95 px-3 pb-1 pt-3 backdrop-blur">
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg disabled:opacity-40"
        >
          {busy ? "Saving..." : "Save Journal Entry"}
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-bg p-2 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}
