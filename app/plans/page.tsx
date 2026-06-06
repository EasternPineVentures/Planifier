import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";
import type { Plan } from "@/lib/plan/schema";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect("/sign-in");
  }

  const rows = await db
    .select({
      id: schema.plans.id,
      ticker: schema.plans.ticker,
      timeframe: schema.plans.timeframe,
      holdingPeriod: schema.plans.holdingPeriod,
      riskPercent: schema.plans.riskPercent,
      plan: schema.plans.plan,
      createdAt: schema.plans.createdAt,
    })
    .from(schema.plans)
    .where(eq(schema.plans.userId, userId))
    .orderBy(desc(schema.plans.createdAt))
    .limit(100);

  return (
    <main className="epv-shell flex min-h-screen flex-col gap-5 !max-w-5xl">
      <Nav />
      <header className="epv-panel-strong p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="epv-kicker">Notebook</p>
            <h1 className="font-display mt-2 text-3xl font-semibold leading-none text-ink">
              My plans
            </h1>
            <p className="mt-1 text-sm text-muted">
              Review prior plans, strategy notes, and journal context.
            </p>
          </div>
          <Link
            href="/plan/new"
            className="epv-button-primary min-h-10 px-3 text-xs"
          >
            New plan
          </Link>
          <Link
            href="/chart"
            className="epv-button-ghost min-h-10 px-3 text-xs"
          >
            Chart
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="epv-panel p-5">
          <p className="text-sm text-muted">
            No saved plans yet.
          </p>
          <p className="mt-2 text-sm text-muted">
            Build your first plan by turning a chart idea into rules, invalidation, and journal prompts.
          </p>
          <Link
            href="/chart"
            className="epv-button-primary mt-4 text-sm"
          >
            Open Learning Chart
          </Link>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <li key={p.id}>
              {(() => {
                const plan = p.plan as Plan | null;
                const chartSave = plan?.chartSave;
                const detailsLine = getDetailsLine(
                  p.ticker,
                  p.timeframe,
                  p.holdingPeriod
                );
                const strategySummary = getStrategySummary(plan);
                const direction = plan?.examplePlan?.direction ?? "not specified";
                const missingPieces = plan?.strategyNotes?.missingPieces;
                const missingCount = Array.isArray(missingPieces)
                  ? missingPieces.length
                  : null;

                return (
                  <article className="surface-panel rounded border border-border bg-panel p-4 transition-colors hover:border-muted hover:bg-bg/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-base text-ink">{detailsLine}</div>
                        {chartSave && (
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                            learning chart save
                          </div>
                        )}
                      </div>
                      <span className="rounded border border-border px-2 py-1 text-[11px] text-muted">
                        risk {trimRisk(p.riskPercent)}%
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-ink">{strategySummary}</p>

                    {chartSave && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                        <PlanMetric label="Entry" value={formatChartLevel(chartSave.entry)} />
                        <PlanMetric label="Stop" value={formatChartLevel(chartSave.stop)} />
                        <PlanMetric label="Target" value={formatChartLevel(chartSave.target)} />
                        <PlanMetric
                          label="R/R"
                          value={
                            chartSave.riskReward === null
                              ? "n/a"
                              : `${chartSave.riskReward.toFixed(2)}R`
                          }
                        />
                      </div>
                    )}

                    <div className="mt-3 space-y-1 text-xs text-muted">
                      <p>
                        Direction: <span className="text-ink">{direction}</span>
                      </p>
                      <p>
                        Missing pieces:{" "}
                        <span className="text-ink">
                          {missingCount === null ? "unavailable" : missingCount}
                        </span>
                      </p>
                      <p>Created {formatCreatedAt(p.createdAt)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/plans/${p.id}`}
                        className="inline-flex rounded border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
                      >
                        Open Plan
                      </Link>
                      {chartSave && (
                        <Link
                          href={`/chart?pair=${encodeURIComponent(
                            chartSave.symbol
                          )}&timeframe=${encodeURIComponent(chartSave.timeframe)}`}
                          className="inline-flex rounded border border-border px-3 py-2 text-sm font-medium text-muted hover:border-muted hover:text-ink"
                        >
                          Open Chart
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-bg p-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-ink">{value}</div>
    </div>
  );
}

function getStrategySummary(plan: Plan | null): string {
  if (!plan?.strategyNotes) {
    return "Strategy notes unavailable for this older plan.";
  }
  const summary = plan.strategyNotes.plainEnglish?.trim();
  if (summary) return summary;
  return "Strategy notes unavailable for this older plan.";
}

function getDetailsLine(
  ticker?: string | null,
  timeframe?: string | null,
  holdingPeriod?: string | null
): string {
  const safeTicker = ticker?.trim();
  const safeTimeframe = timeframe?.trim();
  const safeHolding = holdingPeriod?.trim();
  if (!safeTicker || !safeTimeframe || !safeHolding) {
    return "Plan details incomplete";
  }
  return `${safeTicker} / ${safeTimeframe} / ${safeHolding}`;
}

function trimRisk(value: string): string {
  const normalized = String(value).trim();
  return normalized.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function formatCreatedAt(value: Date): string {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatChartLevel(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(6);
}
