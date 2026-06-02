"use client";

import { useId, useState } from "react";
import type { Plan } from "@/lib/plan/schema";
import TrustedSourceLinks from "@/components/TrustedSourceLinks";

export default function PlanView({
  plan,
  planId,
}: {
  plan: Plan;
  planId?: string;
}) {
  const rules = plan.strategyNotes?.rules ?? [];

  return (
    <div className="space-y-4 text-sm">
      {rules.length > 0 && (
        <PlanSection
          title="Pre-trade checklist"
          summary="Your rules before action"
          defaultOpen
          accent
        >
          <div className="text-sm">{rules.join(" ; ")}</div>
        </PlanSection>
      )}

      <PlanSection
        title="Disclaimer"
        summary="Educational planning only"
      >
        <p className="text-muted">{plan.disclaimer}</p>
      </PlanSection>

      {plan.beginnerGuide && (
        <PlanSection
          title="Still learning translation"
          summary="Simple meaning behind the plan"
          defaultOpen
          accent
        >
          <div className="space-y-3">
            <p>{plan.beginnerGuide.simpleSummary}</p>
            <div>
              <div className="text-xs uppercase text-muted">Key terms</div>
              <dl className="mt-2 space-y-2">
                {plan.beginnerGuide.keyTerms.map((item) => (
                  <div key={item.term} className="border-t border-border/70 pt-2">
                    <dt className="font-medium text-ink">{item.term}</dt>
                    <dd className="mt-1 text-muted">{item.meaning}</dd>
                    <dd className="mt-1 text-xs text-muted">
                      In this plan: {item.inThisPlan}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Step by step</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {plan.beginnerGuide.stepByStep.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <p className="border-l border-accent/60 pl-3 text-xs leading-relaxed text-muted">
              {plan.beginnerGuide.riskTranslation}
            </p>
          </div>
        </PlanSection>
      )}

      {plan.timeframeMismatchWarning && (
        <div className="rounded border border-danger/50 bg-danger/10 p-3 text-danger">
          <strong>Timeframe mismatch:</strong> {plan.timeframeMismatchWarning}
        </div>
      )}

      <PlanSection title="1. Risk notes" summary={`${plan.riskNotes.length} risk notes`}>
        <ul className="list-disc space-y-1 pl-5">
          {plan.riskNotes.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </PlanSection>

      <PlanSection
        title="2. Invalidation"
        summary={plan.invalidation.price ? "Price + condition" : "Condition-based"}
      >
        <div className="rounded border border-accent/40 bg-accent/5 p-3">
          {plan.invalidation.price && (
            <div className="font-mono text-base text-accent">
              {plan.invalidation.price}
            </div>
          )}
          <div className="text-muted">{plan.invalidation.condition}</div>
        </div>
      </PlanSection>

      <PlanSection title="3. Bullish scenario">
        <p>{plan.bullishScenario}</p>
      </PlanSection>

      <PlanSection title="4. Bearish scenario">
        <p>{plan.bearishScenario}</p>
      </PlanSection>

      <PlanSection title="5. Example plan">
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
      </PlanSection>

      <PlanSection title="6. Decision checklist">
        <ul className="space-y-1">
          {plan.decisionChecklist.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">[ ]</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </PlanSection>

      <PlanSection title="7. Journal prompt">
        <p className="italic">{plan.journalPrompt}</p>
      </PlanSection>

      <PlanSection
        title="8. Trusted source links"
        summary={`${(plan.trustedSourceLinks ?? []).length} research links`}
      >
        <TrustedSourceLinks links={plan.trustedSourceLinks ?? []} />
      </PlanSection>

      {plan.cognitiveBiases && plan.cognitiveBiases.length > 0 && (
        <PlanSection title="What you probably want to ignore">
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {plan.cognitiveBiases.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </PlanSection>
      )}

      {plan.strategyNotes ? (
        <PlanSection
          title="Strategy notes"
          summary="How your setup translates into rules"
          defaultOpen
        >
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase text-muted">Plain English</div>
              <p>{plan.strategyNotes.plainEnglish}</p>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Actionable version</div>
              <p className="italic">{plan.strategyNotes.actionableVersion}</p>
            </div>
            {plan.strategyNotes.learningExample && (
              <div>
                <div className="text-xs uppercase text-muted">Example</div>
                <p>{plan.strategyNotes.learningExample}</p>
              </div>
            )}
            <div>
              <div className="text-xs uppercase text-muted">Rules</div>
              <ul className="list-disc pl-5">
                {(plan.strategyNotes.rules ?? []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Avoid</div>
              <ul className="list-disc pl-5">
                {(plan.strategyNotes.avoid ?? []).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            {(plan.strategyNotes.missingPieces ?? []).length > 0 && (
              <div className="rounded border border-danger/40 bg-danger/10 p-2">
                <div className="text-xs uppercase text-danger">Missing pieces</div>
                <ul className="list-disc pl-5">
                  {plan.strategyNotes.missingPieces.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PlanSection>
      ) : (
        <PlanSection title="Strategy notes" defaultOpen>
          <p className="text-muted italic">
            Strategy Notes unavailable for this older plan.
          </p>
        </PlanSection>
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

function PlanSection({
  title,
  summary,
  defaultOpen = false,
  accent = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      className={`rounded border ${
        accent ? "border-accent/60 bg-accent/10" : "border-border bg-panel"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted">
            {title}
          </h3>
          {summary && <p className="mt-1 text-xs text-muted">{summary}</p>}
        </div>
        <span className="text-xs text-muted" aria-hidden="true">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div id={contentId} className="border-t border-border/70 px-3 pb-3 pt-2">
          {children}
        </div>
      )}
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
