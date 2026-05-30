import Nav from "@/components/Nav";
import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <Nav />

      <section className="rounded border border-border bg-panel p-4 sm:p-5">
        <h1 className="font-mono text-xl tracking-tight text-ink">
          Planifier
        </h1>
        <p className="mt-2 text-sm text-ink">
          Turn messy chart thoughts into structured trading plans.
        </p>
        <p className="mt-2 text-xs text-muted">
          Educational planning only. No trade execution.
        </p>
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

        <div className="rounded border border-border bg-panel/60 p-4">
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
          ? "border-accent/60 bg-accent/10 hover:border-accent"
          : "border-border bg-panel hover:border-muted"
      }`}
    >
      <div className="text-base font-medium text-ink">{title}</div>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Link>
  );
}
