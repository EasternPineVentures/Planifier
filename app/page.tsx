import Nav from "@/components/Nav";
import Link from "next/link";

const ACTIONS = [
  {
    index: "01",
    href: "/chart",
    label: "Study",
    title: "Open the Learning Chart",
    body: "Read live candles, compare historical examples, mark levels, and translate the chart before writing a plan.",
  },
  {
    index: "02",
    href: "/plan/new",
    label: "Build",
    title: "Build a Paper Plan",
    body: "Turn one market idea into direction, timeframe, invalidation, risk, and a finished draft.",
  },
  {
    index: "03",
    href: "/plans",
    label: "Review",
    title: "Open the Notebook",
    body: "Review saved plans and journal entries. This is the path for the future one-time save unlock.",
  },
  {
    index: "04",
    href: "https://easternpineventures.com/trading-school",
    label: "School",
    title: "Use the Trading School",
    body: "Keep the concept library separate from trade execution. Learn the language, then practice the workflow.",
    external: true,
  },
] as const;

export default function Page() {
  return (
    <main className="epv-shell epv-rail-shell flex min-h-screen flex-col gap-5">
      <Nav />

      <section className="epv-hero grid min-h-[560px] gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.7fr)] lg:p-12">
        <div className="flex flex-col justify-end">
          <p className="epv-kicker">Eastern Pine Ventures / Planifier</p>
          <h1 className="epv-display mt-5">
            Paper plans before pressure.
          </h1>
          <p className="epv-copy mt-6 max-w-2xl">
            Planifier is the educational planning lane: study one chart, write
            the proof, build a paper plan, then review what actually happened.
            No signals, no execution, no pretending a guess is a system.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/chart" className="epv-button-primary">
              Open chart
            </Link>
            <Link href="/plan/new" className="epv-button-ghost">
              Build plan
            </Link>
            <Link
              href="https://easternpineventures.com/trading-school"
              target="_blank"
              rel="noreferrer"
              className="epv-button-ghost"
            >
              Trading school
            </Link>
          </div>
        </div>

        <div className="grid content-end border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8">
          <p className="epv-kicker">Operating Boundary</p>
          <div className="mt-4 grid border-y border-border">
            <MetricLine label="Mode" value="Paper planning" />
            <MetricLine label="Data" value="Public market context" />
            <MetricLine label="Save path" value="Free first / unlock later" />
            <MetricLine label="Authority" value="Educational only" />
          </div>
          <p className="mt-5 max-w-sm font-mono text-[11px] leading-relaxed text-muted">
            Planifier does not place trades, approve trades, set leverage, or
            move funds.
          </p>
        </div>
      </section>

      <section className="epv-panel-strong p-5 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
          <div>
            <p className="epv-kicker">App Map</p>
            <h2 className="epv-section-title mt-4 max-w-[11ch]">
              One clean path from chart to review.
            </h2>
          </div>
          <div>
            {ACTIONS.map((action) => (
              <ActionLine key={action.index} {...action} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-px border border-border bg-border md:grid-cols-3">
        <PracticePanel
          label="01"
          title="Learn the concept"
          body="Start with trend, level, location, invalidation, and basic indicator agreement before thinking about entries."
        />
        <PracticePanel
          label="02"
          title="Read the chart"
          body="Use the Learning Chart to compare current price with older examples and explain what each indicator is actually measuring."
        />
        <PracticePanel
          label="03"
          title="Build the draft"
          body="Move the chart read into a finished plan only after the wrong-if condition is clear enough to review later."
        />
      </section>

      <footer className="border-t border-border pt-4 text-[11px] leading-6 text-muted">
        NOT FINANCIAL ADVICE. Educational and paper-trading planning only.
        Planifier does not predict markets, place trades, or tell you what to
        buy or sell. Real-money trading adds psychology, slippage, fees,
        liquidity, and emotional pressure that paper trading does not
        replicate. Always do your own research.
      </footer>
    </main>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 border-b border-border py-3 last:border-b-0">
      <span className="font-mono text-[10px] uppercase text-accent">
        {label}
      </span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

function ActionLine({
  index,
  href,
  label,
  title,
  body,
  external = false,
}: {
  index: string;
  href: string;
  label: string;
  title: string;
  body: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="epv-line-row group"
    >
      <span className="epv-line-index">{index}</span>
      <span>
        <span className="epv-line-label block">{label}</span>
        <strong className="font-display mt-2 block text-2xl leading-none text-ink group-hover:text-accent">
          {title}
        </strong>
      </span>
      <span className="text-sm leading-6 text-muted">{body}</span>
    </Link>
  );
}

function PracticePanel({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <article className="min-h-[220px] bg-bg p-5 sm:p-7">
      <span className="font-mono text-xs text-accent">{label}</span>
      <h2 className="font-display mt-8 text-2xl font-semibold leading-none text-ink">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}
