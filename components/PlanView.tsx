"use client";

import type { Plan } from "@/lib/plan/schema";

export default function PlanView({
  plan,
  planId,
}: {
  plan: Plan;
  planId?: string;
}) {
  return (
    <div className="space-y-4 text-sm">
      <Section title="Disclaimer">
        <p className="text-muted">{plan.disclaimer}</p>
      </Section>

      {plan.timeframeMismatchWarning && (
        <div className="rounded border border-danger/50 bg-danger/10 p-3 text-danger">
          <strong>Timeframe mismatch:</strong> {plan.timeframeMismatchWarning}
        </div>
      )}

      <Section title="1. Risk notes">
        <ul className="list-disc space-y-1 pl-5">
          {plan.riskNotes.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section title="2. Invalidation">
        <div className="rounded border border-accent/40 bg-accent/5 p-3">
          {plan.invalidation.price && (
            <div className="font-mono text-base text-accent">
              {plan.invalidation.price}
            </div>
          )}
          <div className="text-muted">{plan.invalidation.condition}</div>
        </div>
      </Section>

      <div className="grid gap-3 md:grid-cols-2">
        <Section title="3. Bullish scenario">
          <p>{plan.bullishScenario}</p>
        </Section>
        <Section title="4. Bearish scenario">
          <p>{plan.bearishScenario}</p>
        </Section>
      </div>

      <Section title="5. Example plan">
        <div className="space-y-2">
          <Row k="Direction" v={plan.examplePlan.direction} />
          <Row k="Entry trigger" v={plan.examplePlan.entryTrigger} />
          <Row k="Stop concept" v={plan.examplePlan.stopConcept} />
          <div>
            <div className="text-xs uppercase text-muted">Profit targets</div>
            <ul className="list-disc pl-5">
              {plan.examplePlan.profitTargets.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <Row k="Sizing note" v={plan.examplePlan.positionSizingNote} />
        </div>
      </Section>

      <Section title="6. Decision checklist">
        <ul className="space-y-1">
          {plan.decisionChecklist.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">[ ]</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="7. Journal prompt">
        <p className="italic">{plan.journalPrompt}</p>
      </Section>

      {plan.cognitiveBiases && plan.cognitiveBiases.length > 0 && (
        <Section title="What you probably want to ignore">
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {plan.cognitiveBiases.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {planId && (
        <a
          href={`/plans/${planId}`}
          className="inline-block rounded border border-border px-3 py-2 text-xs hover:border-accent"
        >
          Open plan & journal →
        </a>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-border bg-panel p-3">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted">{k}</div>
      <div>{v}</div>
    </div>
  );
}
