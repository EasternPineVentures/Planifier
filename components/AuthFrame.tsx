import Link from "next/link";

export default function AuthFrame({
  mode,
  children,
}: {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
}) {
  const isSignIn = mode === "sign-in";

  return (
    <main className="epv-shell grid min-h-screen content-center gap-5 !max-w-6xl">
      <section className="epv-hero grid overflow-hidden p-5 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.64fr)] lg:p-10">
        <div className="flex min-h-[520px] flex-col justify-between gap-8">
          <Link href="/" className="epv-brand">
            <span className="epv-brand-sigil" aria-hidden="true">
              EP
            </span>
            <span className="epv-brand-title">
              <span>Planifier</span>
              <small>Eastern Pine Ventures</small>
            </span>
          </Link>

          <div>
            <p className="epv-kicker">
              {isSignIn ? "Welcome back" : "Start free"}
            </p>
            <h1 className="font-display mt-4 max-w-[10ch] text-5xl font-bold leading-[0.92] text-ink sm:text-6xl">
              {isSignIn ? "Return to the desk." : "Build your planning desk."}
            </h1>
            <p className="epv-copy mt-5 max-w-xl">
              Study the chart, write the proof, build the paper plan, and keep
              the review trail in one place.
            </p>
          </div>

          <div className="grid max-w-xl border-y border-border">
            <AuthLine label="Mode" value="Educational paper planning" />
            <AuthLine label="Boundary" value="No trade execution" />
            <AuthLine label="Provider" value="Clerk secured login" />
          </div>
        </div>

        <div className="flex items-center justify-center border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-border py-3 last:border-b-0">
      <span className="font-mono text-[10px] uppercase text-accent">
        {label}
      </span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}
