import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Chat from "@/components/Chat";
import Nav from "@/components/Nav";

export default async function NewPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6">
      <Nav />
      <section className="rounded border border-border bg-panel p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
          Beginner mode
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ink">
          Build one paper plan from the chart, step by step.
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Pick a market, adjust the levels, load the chart context, then build
          the checklist. Planifier is here to slow the process down enough that
          you know why the plan exists before you practice it.
        </p>
      </section>
      <Chat />
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
