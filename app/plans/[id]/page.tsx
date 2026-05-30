import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import PlanView from "@/components/PlanView";
import JournalForm from "@/components/JournalForm";
import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { and, eq, asc } from "drizzle-orm";
import type { Plan } from "@/lib/plan/schema";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PlanDetail({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

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

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-6">
      <Nav />
      <header className="flex items-baseline gap-3 border-b border-border pb-2">
        <h2 className="font-mono text-lg">{row.ticker}</h2>
        <span className="text-xs text-muted">
          {row.timeframe} · {row.holdingPeriod} · risk {row.riskPercent}%
        </span>
        <span className="ml-auto text-[11px] text-muted">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      </header>

      <PlanView plan={row.plan as Plan} />

      <section className="rounded border border-border bg-panel p-3">
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
          Journal entries
        </h3>
        {journal.length === 0 ? (
          <p className="text-xs text-muted">No entries yet.</p>
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
                {j.notes && <p className="whitespace-pre-wrap">{j.notes}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-border pt-3">
          <JournalForm planId={id} />
        </div>
      </section>
    </main>
  );
}
