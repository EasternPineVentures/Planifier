"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JournalForm({ planId }: { planId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [followed, setFollowed] = useState("");
  const [hit, setHit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: outcome || undefined,
          followedChecklist: followed || undefined,
          hitInvalidation: hit || undefined,
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
      setNotes("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-xs">
      <h4 className="font-mono uppercase text-muted">Add journal entry</h4>
      <div className="grid grid-cols-3 gap-2">
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
      <textarea
        placeholder="What did you actually do? What did you feel? What broke?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="w-full rounded border border-border bg-bg p-2"
      />
      {err && <p className="text-danger">{err}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="rounded bg-accent px-3 py-1.5 font-medium text-bg disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save entry"}
      </button>
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
      <span className="mb-1 block text-[10px] uppercase text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-bg p-1.5"
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
