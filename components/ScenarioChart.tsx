"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildScenarioChartNote,
  getScenarioPriceRange,
  SCENARIO_CHART_EXAMPLES,
  type ScenarioBranch,
  type ScenarioChartExample,
  type ScenarioTone,
} from "@/lib/plan/scenarioCharts";
import type { HistoricalScenarioMap } from "@/lib/plan/historicalScenarios";

const WIDTH = 360;
const HEIGHT = 190;
const PAD = 22;
const CANDLE_WIDTH = 10;

const TONE_STYLES: Record<ScenarioTone, { stroke: string; label: string }> = {
  confirm: { stroke: "#35FF9A", label: "confirmation" },
  fail: { stroke: "#EF4444", label: "failure" },
  wait: { stroke: "#9BAAA1", label: "wait" },
};

export default function ScenarioChart({
  historicalScenario,
  historicalBusy = false,
  historicalError,
  onRequestHistorical,
  onUseScenario,
  className = "",
}: {
  historicalScenario?: HistoricalScenarioMap | null;
  historicalBusy?: boolean;
  historicalError?: string | null;
  onRequestHistorical?: () => void;
  onUseScenario?: (note: string) => void;
  className?: string;
}) {
  const examples = useMemo<Array<ScenarioChartExample | HistoricalScenarioMap>>(
    () =>
      historicalScenario
        ? [historicalScenario, ...SCENARIO_CHART_EXAMPLES]
        : SCENARIO_CHART_EXAMPLES,
    [historicalScenario]
  );
  const [exampleId, setExampleId] = useState<ScenarioChartExample["id"]>(
    examples[0].id
  );
  const [branchLabel, setBranchLabel] = useState(examples[0].branches[0].label);

  useEffect(() => {
    if (!historicalScenario) return;
    setExampleId(historicalScenario.id);
    setBranchLabel(historicalScenario.branches[0]?.label ?? "");
  }, [historicalScenario]);

  const example = useMemo(
    () => examples.find((item) => item.id === exampleId) ?? examples[0],
    [exampleId, examples]
  );
  const selectedBranch =
    example.branches.find((branch) => branch.label === branchLabel) ??
    example.branches[0];
  const evidence = isHistoricalScenario(example) ? example.evidence : null;

  function selectExample(next: ScenarioChartExample | HistoricalScenarioMap) {
    setExampleId(next.id);
    setBranchLabel(next.branches[0].label);
  }

  return (
    <section className={`surface-panel rounded border border-border bg-panel p-4 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Historical examples
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Practice the paths before the chart chooses one.
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Compare support retests, failed breakouts, and range-middle examples.
            Generate a history-backed map when market data is available.
          </p>
        </div>
        <span className="rounded border border-accent/40 px-2 py-1 text-[10px] uppercase text-accent">
          {evidence ? "history-backed" : "paper only"}
        </span>
      </div>

      {onRequestHistorical && (
        <button
          type="button"
          onClick={onRequestHistorical}
          disabled={historicalBusy}
          className="mt-3 w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg disabled:opacity-40"
        >
          {historicalBusy ? "Mapping history..." : "Generate historical scenario map"}
        </button>
      )}

      {historicalError && (
        <div className="mt-3 rounded border border-danger/50 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
          {historicalError}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1">
        {examples.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectExample(item)}
            className={`rounded border px-2 py-2 text-left text-[11px] ${
              example.id === item.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-ink"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div>
          <div className="overflow-hidden rounded border border-border bg-bg">
            <ScenarioSvg example={example} selectedBranch={selectedBranch} />
          </div>

          <div className="mt-3">
            <h3 className="text-sm font-medium">{example.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{example.setup}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {example.beginnerSummary}
            </p>
            {evidence && (
              <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
                <p>
                  Evidence checked:{" "}
                  <span className="text-ink">{evidence.historicalSampleCount}</span>{" "}
                  similar recent episodes.
                </p>
                <p>
                  Pattern evidence:{" "}
                  <span className="text-ink">
                    {evidence.pattern.evidenceQuality}
                  </span>
                  .
                </p>
                {evidence.warnings.map((warning) => (
                  <p key={warning} className="text-danger">
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="space-y-2">
            {example.branches.map((branch) => {
              const active = branch.label === selectedBranch.label;
              const tone = TONE_STYLES[branch.tone];
              return (
                <button
                  key={branch.label}
                  type="button"
                  onClick={() => setBranchLabel(branch.label)}
                  className={`w-full rounded border px-3 py-2 text-left ${
                    active
                      ? "border-accent/60 bg-accent/10"
                      : "border-border hover:border-muted"
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink">{branch.label}</span>
                    <span
                      className="text-[10px] uppercase"
                      style={{ color: active ? tone.stroke : undefined }}
                    >
                      {tone.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    {branch.watchFor}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted">
            <p>
              <span className="text-ink">If it happens:</span>{" "}
              {selectedBranch.ifHappens}
            </p>
            <p className="mt-1">
              <span className="text-ink">Invalidated if:</span>{" "}
              {selectedBranch.invalidatedIf}
            </p>
          </div>
        </div>
      </div>

      {onUseScenario && (
        <button
          type="button"
          onClick={() =>
            onUseScenario(buildScenarioChartNote(example, selectedBranch))
          }
          className="mt-3 w-full rounded border border-accent/50 px-3 py-2 text-left text-xs text-accent"
        >
          Add this scenario to chart context
        </button>
      )}
    </section>
  );
}

function isHistoricalScenario(
  example: ScenarioChartExample | HistoricalScenarioMap
): example is HistoricalScenarioMap {
  return "evidence" in example;
}

function ScenarioSvg({
  example,
  selectedBranch,
}: {
  example: ScenarioChartExample;
  selectedBranch: ScenarioBranch;
}) {
  const range = getScenarioPriceRange(example);
  const candleStep = 26;
  const lastCandle = example.candles[example.candles.length - 1];
  const lastX = PAD + (example.candles.length - 1) * candleStep;
  const lastY = yFor(lastCandle.close, range.min, range.max);
  const levelY = yFor(example.levelPrice, range.min, range.max);
  const projectionStep = 32;
  const projectedPoints = selectedBranch.path.map((price, index) => ({
    x: lastX + projectionStep * (index + 1),
    y: yFor(price, range.min, range.max),
  }));
  const pathD = [
    `M ${lastX} ${lastY}`,
    ...projectedPoints.map((point) => `L ${point.x} ${point.y}`),
  ].join(" ");
  const branchStyle = TONE_STYLES[selectedBranch.tone];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${example.title} scenario chart`}
      className="block aspect-[360/190] w-full"
    >
      <rect width={WIDTH} height={HEIGHT} fill="#050807" />
      {[0, 1, 2].map((line) => (
        <line
          key={line}
          x1={PAD}
          x2={WIDTH - PAD}
          y1={PAD + line * 54}
          y2={PAD + line * 54}
          stroke="#174D36"
          strokeWidth="1"
        />
      ))}
      <line
        x1={PAD}
        x2={WIDTH - PAD}
        y1={levelY}
        y2={levelY}
        stroke="#6F8F72"
        strokeDasharray="5 5"
        strokeWidth="1.5"
      />
      <text x={PAD} y={levelY - 6} fill="#9BAAA1" fontSize="10">
        {example.levelLabel}
      </text>

      {example.candles.map((candle, index) => {
        const x = PAD + index * candleStep;
        const openY = yFor(candle.open, range.min, range.max);
        const closeY = yFor(candle.close, range.min, range.max);
        const highY = yFor(candle.high, range.min, range.max);
        const lowY = yFor(candle.low, range.min, range.max);
        const up = candle.close >= candle.open;
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 3);
        return (
          <g key={`${candle.open}-${index}`}>
            <line
              x1={x}
              x2={x}
              y1={highY}
              y2={lowY}
              stroke={up ? "#22C55E" : "#EF4444"}
              strokeWidth="1.5"
            />
            <rect
              x={x - CANDLE_WIDTH / 2}
              y={bodyY}
              width={CANDLE_WIDTH}
              height={bodyHeight}
              rx="1"
              fill={up ? "#22C55E" : "#EF4444"}
              opacity="0.82"
            />
          </g>
        );
      })}

      <path
        d={pathD}
        fill="none"
        stroke={branchStyle.stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="7 6"
      />
      {projectedPoints.map((point, index) => (
        <circle
          key={`${selectedBranch.label}-${index}`}
          cx={point.x}
          cy={point.y}
          r="3"
          fill={branchStyle.stroke}
        />
      ))}
      <text
        x={WIDTH - PAD}
        y={Math.max(16, projectedPoints[projectedPoints.length - 1].y - 8)}
        fill={branchStyle.stroke}
        fontSize="10"
        textAnchor="end"
      >
        {selectedBranch.label}
      </text>
    </svg>
  );
}

function yFor(price: number, min: number, max: number): number {
  const usableHeight = HEIGHT - PAD * 2;
  const pct = (price - min) / (max - min);
  return HEIGHT - PAD - pct * usableHeight;
}
