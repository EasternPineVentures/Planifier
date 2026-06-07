import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import SimplePlanBuilder from "@/components/SimplePlanBuilder";

export default async function NewPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="epv-shell epv-rail-shell flex min-h-screen flex-col gap-5">
      <Nav />
      <SimplePlanBuilder />
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
