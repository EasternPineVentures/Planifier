import type { Metadata } from "next";
import ChartLabClient from "@/components/chart/ChartLabClient";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Learning Chart",
  description:
    "Read live public market candles with beginner chart explanations and practice levels.",
};

export default function ChartPage() {
  return (
    <main className="epv-shell epv-rail-shell flex min-h-screen flex-col gap-5 !max-w-[1720px]">
      <Nav />
      <ChartLabClient />
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
