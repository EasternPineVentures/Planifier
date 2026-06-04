"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeChartWorkspace,
  buildPracticeCandles,
  CHART_PATTERNS,
  getDefaultWorkspaceLevels,
  getWorkspacePriceRange,
  type ChartLineId,
  type ChartPatternId,
  type WorkspaceCandle,
  type WorkspaceLevels,
} from "@/lib/plan/chartWorkspace";

const WIDTH = 920;
const HEIGHT = 420;
const PAD_X = 34;
const PAD_Y = 34;
const CANDLE_WIDTH = 12;

const LINE_STYLES: Record<ChartLineId, { label: string; color: string }> = {
  support: { label: "Support", color: "#2f7d32" },
  resistance: { label: "Resistance", color: "#c77b2a" },
  invalidation: { label: "Invalidation", color: "#b33a46" },
};

export default function ChartWorkspace({
  pair,
  timeframe,
  style,
  onUseChartContext,
}: {
  pair: string;
  timeframe: string;
  style: string;
  onUseChartContext: (note: string) => void;
}) {
  const [pattern, setPattern] = useState<ChartPatternId>("slide-pressure");
  const candles = useMemo(() => buildPracticeCandles(pattern), [pattern]);
  const [levels, setLevels] = useState<WorkspaceLevels>(() =>
    getDefaultWorkspaceLevels(candles, pattern)
  );
  const [dragging, setDragging] = useState<ChartLineId | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const priceRange = useMemo(
    () => getWorkspacePriceRange(candles, levels),
    [candles, levels]
  );
  const feedback = useMemo(
    () =>
      analyzeChartWorkspace({
        pair,
        timeframe,
        pattern,
        candles,
        levels,
      }),
    [candles, levels, pair, pattern, timeframe]
  );

  useEffect(() => {
    setLevels(getDefaultWorkspaceLevels(candles, pattern));
  }, [candles, pattern]);

  function setLevel(line: ChartLineId, value: number) {
    setLevels((current) => ({
      ...current,
      [line]: clamp(value, priceRange.min, priceRange.max),
    }));
  }

  function updateDraggedLevel(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    setLevel(dragging, priceForY(y, priceRange.min, priceRange.max));
  }

  return (
    <section className="surface-panel rounded border border-border bg-panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Step 2 / chart workspace
          </div>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            Put the levels where your idea becomes clear.
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Drag the support, resistance, and wrong-if lines. The readout updates
            live, then one button loads the chart into your plan.
          </p>
        </div>
        <span className="shrink-0 rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
          {pair || "BTC/USD"} / {timeframe || "4H"} / {style}
        </span>
      </div>

      <div className="mt-4 rounded border border-accent/25 bg-accent/5 p-3 text-sm leading-relaxed text-ink">
        Do this now: adjust one level, read the feedback, then click
        <span className="font-medium"> Load chart into plan</span>. You do not
        need a perfect prediction. You need a clear practice rule.
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {CHART_PATTERNS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPattern(item.id)}
                className={`rounded border px-3 py-2 text-left ${
                  pattern === item.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-muted"
                }`}
              >
                <span className="block text-xs font-medium text-ink">
                  {item.label}
                </span>
                <span className="mt-1 block text-[10px] leading-relaxed text-muted">
                  {item.plainEnglish}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded border border-border bg-bg">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`${pair || "Practice"} ${timeframe || "chart"} workspace`}
              className="block aspect-[920/420] w-full touch-none"
              onPointerMove={updateDraggedLevel}
              onPointerUp={() => setDragging(null)}
              onPointerLeave={() => setDragging(null)}
            >
              <rect width={WIDTH} height={HEIGHT} fill="#fbfdf8" />
              <ChartGrid />
              <CandleLayer candles={candles} min={priceRange.min} max={priceRange.max} />
              {(Object.keys(LINE_STYLES) as ChartLineId[]).map((line) => (
                <LevelLine
                  key={line}
                  id={line}
                  value={levels[line]}
                  min={priceRange.min}
                  max={priceRange.max}
                  active={dragging === line}
                  onPointerDown={() => setDragging(line)}
                />
              ))}
            </svg>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(Object.keys(LINE_STYLES) as ChartLineId[]).map((line) => (
              <label
                key={line}
                className="rounded border border-border bg-bg p-2"
              >
                <span
                  className="block font-mono text-[10px] uppercase"
                  style={{ color: LINE_STYLES[line].color }}
                >
                  {LINE_STYLES[line].label} {levels[line].toFixed(2)}
                </span>
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  step="0.1"
                  value={levels[line]}
                  onChange={(event) => setLevel(line, Number(event.target.value))}
                  className="mt-2 w-full accent-lime-300"
                />
              </label>
            ))}
          </div>
        </div>

        <aside className="rounded border border-border bg-bg p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Live chart read
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed">
            <FeedbackRow label="Trend" value={feedback.trend} />
            <FeedbackRow label="Location" value={feedback.location} />
            <FeedbackRow label="Quality" value={feedback.quality} />
            <FeedbackRow label="Next check" value={feedback.nextCheck} />
            <FeedbackRow label="Wrong if" value={feedback.invalidationRead} />
          </div>
          <div className="mt-3 rounded border border-border/80 bg-panel p-3 text-xs leading-relaxed text-muted">
            {feedback.chartNote}
          </div>
          <button
            type="button"
            onClick={() => onUseChartContext(feedback.chartNote)}
            className="mt-3 w-full rounded bg-accent px-3 py-3 text-sm font-medium text-bg"
          >
            Load chart into plan
          </button>
        </aside>
      </div>
    </section>
  );
}

function ChartGrid() {
  return (
    <>
      {[0, 1, 2, 3].map((line) => {
        const y = PAD_Y + line * ((HEIGHT - PAD_Y * 2) / 3);
        return (
          <line
            key={`h-${line}`}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={y}
            y2={y}
            stroke="#dfe7e1"
            strokeWidth="1"
          />
        );
      })}
      {[0, 1, 2, 3, 4].map((line) => {
        const x = PAD_X + line * ((WIDTH - PAD_X * 2) / 4);
        return (
          <line
            key={`v-${line}`}
            x1={x}
            x2={x}
            y1={PAD_Y}
            y2={HEIGHT - PAD_Y}
            stroke="#ebf0ec"
            strokeWidth="1"
          />
        );
      })}
    </>
  );
}

function CandleLayer({
  candles,
  min,
  max,
}: {
  candles: WorkspaceCandle[];
  min: number;
  max: number;
}) {
  const step = (WIDTH - PAD_X * 2) / candles.length;
  return (
    <>
      {candles.map((candle, index) => {
        const x = PAD_X + step * index + step / 2;
        const openY = yFor(candle.open, min, max);
        const closeY = yFor(candle.close, min, max);
        const highY = yFor(candle.high, min, max);
        const lowY = yFor(candle.low, min, max);
        const up = candle.close >= candle.open;
        const color = up ? "#2f7d32" : "#b33a46";
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 3);
        return (
          <g key={`${candle.open}-${candle.close}-${index}`}>
            <line
              x1={x}
              x2={x}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth="1.6"
              opacity="0.82"
            />
            <rect
              x={x - CANDLE_WIDTH / 2}
              y={bodyY}
              width={CANDLE_WIDTH}
              height={bodyHeight}
              rx="1.5"
              fill={color}
              opacity="0.88"
            />
          </g>
        );
      })}
    </>
  );
}

function LevelLine({
  id,
  value,
  min,
  max,
  active,
  onPointerDown,
}: {
  id: ChartLineId;
  value: number;
  min: number;
  max: number;
  active: boolean;
  onPointerDown: () => void;
}) {
  const y = yFor(value, min, max);
  const style = LINE_STYLES[id];
  return (
    <g
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointerDown();
      }}
      className="cursor-row-resize"
    >
      <line
        x1={PAD_X}
        x2={WIDTH - PAD_X}
        y1={y}
        y2={y}
        stroke={style.color}
        strokeWidth={active ? "3.5" : "2"}
        strokeDasharray={id === "invalidation" ? "7 6" : undefined}
      />
      <rect
        x={WIDTH - PAD_X - 126}
        y={y - 13}
        width="126"
        height="26"
        rx="5"
        fill="#ffffff"
        stroke={style.color}
        opacity="0.95"
      />
      <text
        x={WIDTH - PAD_X - 8}
        y={y + 4}
        fill={style.color}
        fontSize="11"
        textAnchor="end"
      >
        {style.label} {value.toFixed(2)}
      </text>
    </g>
  );
}

function FeedbackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border/80 pt-2 first:border-t-0 first:pt-0">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-1 text-ink">{value}</div>
    </div>
  );
}

function yFor(price: number, min: number, max: number): number {
  const usableHeight = HEIGHT - PAD_Y * 2;
  const pct = (price - min) / (max - min);
  return HEIGHT - PAD_Y - pct * usableHeight;
}

function priceForY(y: number, min: number, max: number): number {
  const usableHeight = HEIGHT - PAD_Y * 2;
  const pct = (HEIGHT - PAD_Y - y) / usableHeight;
  return min + pct * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
