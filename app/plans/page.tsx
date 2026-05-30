import Link from "next/link";
import Nav from "@/components/Nav";
import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: schema.plans.id,
      ticker: schema.plans.ticker,
      timeframe: schema.plans.timeframe,
      holdingPeriod: schema.plans.holdingPeriod,
      riskPercent: schema.plans.riskPercent,
      createdAt: schema.plans.createdAt,
    })
    .from(schema.plans)
    .where(eq(schema.plans.userId, userId))
    .orderBy(desc(schema.plans.createdAt))
    .limit(100);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6">
      <Nav />
      <h2 className="font-mono text-lg">My plans</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No plans yet. Build one on the{" "}
          <Link href="/" className="text-accent underline">
            home page
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-border rounded border border-border bg-panel">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plans/${p.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-3 py-2 text-sm hover:bg-bg"
              >
                <span className="font-mono">{p.ticker}</span>
                <span className="text-muted">{p.timeframe}</span>
                <span className="text-muted">{p.holdingPeriod}</span>
                <span className="text-muted">{p.riskPercent}%</span>
                <span className="text-[11px] text-muted">
                  {new Date(p.createdAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
