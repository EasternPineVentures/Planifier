"use client";

import { useRouter } from "next/navigation";
import LearningChartLoader from "@/components/chart/LearningChartLoader";
import {
  PLAN_BUILDER_CONTEXT_STORAGE_KEY,
  type StoredBuilderContext,
} from "@/lib/plan/builderStorage";

export default function ChartLabClient() {
  const router = useRouter();

  function useChartRead(note: string) {
    const params = new URLSearchParams(window.location.search);
    const context: StoredBuilderContext = {
      source: "chart_lab",
      createdAt: new Date().toISOString(),
      pair: params.get("pair") ?? undefined,
      timeframe: params.get("timeframe") ?? undefined,
      chartNote: note,
    };

    window.sessionStorage.setItem(
      PLAN_BUILDER_CONTEXT_STORAGE_KEY,
      JSON.stringify(context)
    );
    router.push("/plan/new");
  }

  return <LearningChartLoader onUseChartContext={useChartRead} />;
}
