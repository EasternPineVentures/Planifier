import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import PlanView from "@/components/PlanView";
import JournalForm from "@/components/JournalForm";
import DeletePlanButton from "@/components/DeletePlanButton";
import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { and, eq, asc } from "drizzle-orm";
import type { Plan } from "@/lib/plan/schema";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PlanDetail({ params }: Props) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect("/sign-in");
  }

  const [row] = await db
    .select()
    .from(schema.plans)
    .where(and(eq(schema.plans.id, id), eq(schema.plans.userId, userId)))
    .limit(1);
  if (!row) notFound();

  const journal = await db
    .select()
    .from(schema.journalEntries)
    .where(eq(schema.journalEntries.planId, id))
    .orderBy(asc(schema.journalEntries.createdAt));

  const plan = row.plan as Plan;
  const strategyRules = plan.strategyNotes?.rules ?? [];

  return (
    <main className="epv-shell flex min-h-screen flex-col gap-5 !max-w-5xl">
      <Nav />
      <header className="epv-panel-strong flex flex-wrap items-baseline gap-3 p-5">
        <div>
          <p className="epv-kicker">Saved plan</p>
          <h1 className="font-display mt-2 text-3xl font-semibold leading-none text-ink">
            {row.ticker}
          </h1>
        </div>
        <span className="text-xs text-muted">
          {row.timeframe} / {row.holdingPeriod} / risk {row.riskPercent}%
        </span>
        {plan.chartSave && (
          <a
            href={`/chart?pair=${encodeURIComponent(
              plan.chartSave.symbol
            )}&timeframe=${encodeURIComponent(plan.chartSave.timeframe)}`}
            className="epv-button-ghost min-h-9 px-3 text-[11px]"
          >
            Open Chart
          </a>
        )}
        <span className="ml-auto text-[11px] text-muted">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      </header>

      <PlanView plan={plan} />

      <section className="epv-panel p-4">
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
          Journal entries
        </h3>
        {journal.length === 0 ? (
          <div className="space-y-1 text-xs text-muted">
            <p>No journal entries yet.</p>
            <p>
              After the plan plays out, write down what happened and whether you followed your own rules.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {journal.map((j) => (
              <li key={j.id} className="rounded border border-border bg-bg p-2 text-xs">
                <div className="mb-1 flex gap-3 text-muted">
                  <span>{new Date(j.createdAt).toLocaleString()}</span>
                  {j.outcome && <span>outcome: {j.outcome}</span>}
                  {j.followedChecklist && (
                    <span>checklist: {j.followedChecklist}</span>
                  )}
                  {j.hitInvalidation && (
                    <span>invalidation hit: {j.hitInvalidation}</span>
                  )}
                </div>
                {j.vsPlan && (
                  <p className="mb-1 text-muted">
                    <span className="font-mono text-[10px] uppercase tracking-wider">
                      vs. plan:
                    </span>{" "}
                    {j.vsPlan}
                  </p>
                )}
                {j.notes && <p className="whitespace-pre-wrap">{j.notes}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-border pt-3">
          <JournalForm planId={id} strategyRules={strategyRules} />
        </div>
      </section>

      <section className="rounded border border-danger/30 bg-danger/5 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-danger">
              Plan cleanup
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Delete only when this saved plan is no longer useful for review.
            </p>
          </div>
          <DeletePlanButton planId={id} />
        </div>
      </section>
    </main>
  );
}
