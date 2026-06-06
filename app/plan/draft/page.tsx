import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import PlanDraftClient from "@/components/PlanDraftClient";

export const metadata: Metadata = {
  title: "Finished Draft",
  description:
    "Review a finished Planifier paper-trading draft away from the chart builder.",
};

export default async function PlanDraftPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="epv-shell flex min-h-screen flex-col gap-5 !max-w-[1180px]">
      <Nav />
      <PlanDraftClient />
      <footer className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        NOT FINANCIAL ADVICE. Educational and paper-trading planning only.
        Planifier does not predict markets, place trades, or tell you what to
        buy or sell.
      </footer>
    </main>
  );
}
