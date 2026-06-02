import Nav from "@/components/Nav";
import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6">
      <Nav />

      <section className="surface-panel overflow-hidden rounded border border-border bg-panel">
        <div className="data-grid border-b border-border px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              Planifier planning desk
            </span>
            <span className="rounded border border-amber/40 bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase text-amber">
              paper only
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <h1 className="font-mono text-2xl tracking-tight text-ink sm:text-3xl">
            Planifier
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink">
            Turn messy chart thoughts into structured educational plans with
            confirmation, invalidation, scenario paths, and fixed-risk practice.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] uppercase tracking-wider text-muted sm:grid-cols-3">
            <span className="rounded border border-border bg-bg/70 px-3 py-2">
              risk locked
            </span>
            <span className="rounded border border-border bg-bg/70 px-3 py-2">
              live context
            </span>
            <span className="rounded border border-border bg-bg/70 px-3 py-2">
              no execution
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <ActionCard
          href="/plan/new"
          title="Build New Plan"
          body="Upload or describe a chart and turn it into a structured plan."
          primary
        />

        <ActionCard
          href="/plans"
          title="View Saved Plans"
          body="Review plans, strategy notes, and journal entries."
        />

        <div className="surface-panel rounded border border-border bg-panel/70 p-4">
          <div className="text-base font-medium text-ink">Learning Workspace</div>
          <p className="mt-1 text-sm text-muted">
            Practice explaining your setup before risking real money.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 w-full rounded border border-border px-3 py-3 text-sm text-muted opacity-70"
            aria-disabled="true"
          >
            Coming soon
          </button>
        </div>
      </section>

      <footer className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        NOT FINANCIAL ADVICE. Educational and paper-trading planning only.
        Planifier does not predict markets, place trades, or tell you what to
        buy or sell. Real-money trading adds psychology, slippage, fees,
        liquidity, and emotional pressure that paper trading does not
        replicate. Always do your own research.
      </footer>
    </main>
  );
}

function ActionCard({
  href,
  title,
  body,
  primary = false,
}: {
  href: string;
  title: string;
  body: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded border p-4 transition-colors sm:p-5 ${
        primary
          ? "surface-panel border-accent/60 bg-accent/10 hover:border-accent"
          : "surface-panel border-border bg-panel hover:border-muted"
      }`}
    >
      <div className="text-base font-medium text-ink">{title}</div>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
