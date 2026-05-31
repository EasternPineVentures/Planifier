import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BuildPlanStepper from "@/components/BuildPlanStepper";
import Nav from "@/components/Nav";

export default async function NewPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Nav />
      <p className="text-sm text-muted">
        Turn your own chart read into a paper-trade checklist. If you are new,
        start with the examples and let the builder show what a useful plan needs.
      </p>
      <BuildPlanStepper />
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
