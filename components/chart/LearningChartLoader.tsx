"use client";

import dynamic from "next/dynamic";

const LearningChartWorkspace = dynamic(
  () => import("@/components/chart/LearningChartWorkspace"),
  {
    ssr: false,
    loading: () => (
      <section className="epv-panel-strong overflow-hidden">
        <div className="data-grid border-b border-border px-4 py-4 sm:px-5">
          <p className="epv-kicker">Learning Chart V1</p>
          <h1 className="font-display mt-2 text-3xl font-semibold leading-none text-ink sm:text-4xl">
            Loading the chart workspace.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Preparing public candle data, chart controls, indicator reads, and
            historical examples.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <div className="h-[560px] animate-pulse border border-border bg-bg/80" />
        </div>
      </section>
    ),
  }
);

export default function LearningChartLoader({
  initialPair,
  initialTimeframe,
  onUseChartContext,
}: {
  initialPair?: string;
  initialTimeframe?: string;
  onUseChartContext?: (note: string) => void;
}) {
  return (
    <LearningChartWorkspace
      initialPair={initialPair}
      initialTimeframe={initialTimeframe}
      onUseChartContext={onUseChartContext}
    />
  );
}
