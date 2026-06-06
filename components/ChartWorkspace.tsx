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
import {
  buildPracticeTradeSnapshot,
  getPracticeTradeStatusLabel,
  PRACTICE_TRADE_LOCAL_LIMIT,
  PRACTICE_TRADE_STORAGE_KEY,
  summarizePracticeTrade,
  type PracticeTradeSnapshot,
  type PracticeTradeStatus,
} from "@/lib/plan/practiceTrades";

const WIDTH = 920;
const HEIGHT = 500;
const PAD_LEFT = 54;
const PAD_RIGHT = 76;
const PAD_TOP = 34;
const PAD_BOTTOM = 34;
const VOLUME_HEIGHT = 72;
const VOLUME_GAP = 14;
const PRICE_BOTTOM = HEIGHT - PAD_BOTTOM - VOLUME_HEIGHT - VOLUME_GAP;
const VOLUME_TOP = PRICE_BOTTOM + VOLUME_GAP;
const CANDLE_WIDTH = 11;

const LINE_STYLES: Record<ChartLineId, { label: string; color: string }> = {
  support: { label: "Support", color: "#35FF9A" },
  resistance: { label: "Resistance", color: "#FFB84D" },
  invalidation: { label: "Invalidation", color: "#EF4444" },
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
  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    price: number;
    candleIndex: number;
    candle: WorkspaceCandle;
  } | null>(null);
  const [savedPracticeTrades, setSavedPracticeTrades] = useState<
    PracticeTradeSnapshot[]
  >([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const priceRange = useMemo(
    () => getWorkspacePriceRange(candles, levels),
    [candles, levels]
  );
  const lastCandle = candles[candles.length - 1];
  const inspectedCandle = crosshair?.candle ?? lastCandle;
  const priorCandle = candles[candles.length - 2] ?? lastCandle;
  const priceChange = lastCandle.close - priorCandle.close;
  const priceChangePct =
    priorCandle.close === 0 ? 0 : (priceChange / priorCandle.close) * 100;
  const displayPair = pair || "BTC/USD";
  const displayTimeframe = timeframe || "4H";
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRACTICE_TRADE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      setSavedPracticeTrades(
        parsed.filter(isPracticeTradeSnapshot).slice(0, PRACTICE_TRADE_LOCAL_LIMIT)
      );
    } catch {
      // Ignore malformed or blocked browser storage and keep the chart usable.
    }
  }, []);

  function setLevel(line: ChartLineId, value: number) {
    setLevels((current) => ({
      ...current,
      [line]: clamp(value, priceRange.min, priceRange.max),
    }));
  }

  function persistPracticeTrades(next: PracticeTradeSnapshot[]) {
    setSavedPracticeTrades(next);
    try {
      localStorage.setItem(PRACTICE_TRADE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setSaveMessage(
        "Saved for this session, but browser storage is blocked."
      );
    }
  }

  function savePracticeTrade() {
    const snapshot = buildPracticeTradeSnapshot({
      pair: displayPair,
      timeframe: displayTimeframe,
      style,
      pattern,
      candles,
      levels,
      feedback,
    });
    const next = [
      snapshot,
      ...savedPracticeTrades.filter((trade) => trade.id !== snapshot.id),
    ].slice(0, PRACTICE_TRADE_LOCAL_LIMIT);
    persistPracticeTrades(next);
    setSaveMessage(
      "Saved as a practice trade in this browser. Cloud save can be the paid version later."
    );
  }

  function updatePracticeTradeStatus(
    id: string,
    status: PracticeTradeStatus
  ) {
    persistPracticeTrades(
      savedPracticeTrades.map((trade) =>
        trade.id === id ? { ...trade, status } : trade
      )
    );
  }

  function removePracticeTrade(id: string) {
    persistPracticeTrades(savedPracticeTrades.filter((trade) => trade.id !== id));
    setSaveMessage("Practice trade removed.");
  }

  function updateDraggedLevel(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    setLevel(dragging, priceForY(y, priceRange.min, priceRange.max));
  }

  function updateCrosshair(event: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const rawY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    const x = clamp(rawX, PAD_LEFT, WIDTH - PAD_RIGHT);
    const y = clamp(rawY, PAD_TOP, PRICE_BOTTOM);
    const step = chartWidth() / candles.length;
    const candleIndex = clampIndex(
      Math.round((x - PAD_LEFT - step / 2) / step),
      candles.length
    );

    setCrosshair({
      x,
      y,
      price: priceForY(y, priceRange.min, priceRange.max),
      candleIndex,
      candle: candles[candleIndex],
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    updateCrosshair(event);
    updateDraggedLevel(event);
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
          <div className="overflow-hidden rounded border border-border bg-bg shadow-[inset_0_1px_0_rgba(231,255,243,0.05)]">
            <div className="border-b border-border bg-panel/80 px-3 py-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">
                    {displayPair}
                  </span>
                  <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted">
                    {displayTimeframe}
                  </span>
                  <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted">
                    Candles
                  </span>
                  <span className="rounded border border-amber/40 px-2 py-1 font-mono text-[10px] uppercase text-amber">
                    paper replay
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted">
                  <span>
                    O <span className="text-ink">{inspectedCandle.open.toFixed(2)}</span>
                  </span>
                  <span>
                    H <span className="text-ink">{inspectedCandle.high.toFixed(2)}</span>
                  </span>
                  <span>
                    L <span className="text-ink">{inspectedCandle.low.toFixed(2)}</span>
                  </span>
                  <span>
                    C <span className="text-ink">{inspectedCandle.close.toFixed(2)}</span>
                  </span>
                  <span
                    className={
                      priceChange >= 0 ? "text-success" : "text-danger"
                    }
                  >
                    {formatSigned(priceChange)} / {formatSigned(priceChangePct)}%
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {CHART_PATTERNS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.plainEnglish}
                    onClick={() => setPattern(item.id)}
                    className={`rounded border px-2 py-1.5 text-left text-[11px] ${
                      pattern === item.id
                        ? "border-accent bg-accent/15 text-ink"
                        : "border-border text-muted hover:border-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`${displayPair} ${displayTimeframe} chart workspace`}
              className="block aspect-[920/500] w-full touch-none"
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDragging(null)}
              onPointerLeave={() => {
                setDragging(null);
                setCrosshair(null);
              }}
            >
              <rect width={WIDTH} height={HEIGHT} fill="#050807" />
              <ChartGrid min={priceRange.min} max={priceRange.max} />
              <VolumeLayer candles={candles} />
              <CandleLayer candles={candles} min={priceRange.min} max={priceRange.max} />
              <LastPriceCallout
                candle={lastCandle}
                candles={candles}
                min={priceRange.min}
                max={priceRange.max}
              />
              <CurrentPriceLine value={lastCandle.close} min={priceRange.min} max={priceRange.max} />
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
              <TimeAxis candles={candles} />
              <CrosshairLayer crosshair={crosshair} />
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
                  className="mt-2 w-full accent-accent"
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
          <button
            type="button"
            onClick={savePracticeTrade}
            className="mt-2 w-full rounded border border-accent/60 bg-accent/10 px-3 py-3 text-sm font-medium text-accent hover:border-accent"
          >
            Save practice trade
          </button>
          <div className="mt-3 rounded border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-muted">
            <div className="font-mono text-[10px] uppercase tracking-wider text-amber">
              future paid sync
            </div>
            <p className="mt-1">
              V1 saves in this browser. Paid accounts can later keep cloud
              history, chart snapshots, and review filters across devices.
            </p>
          </div>
          {saveMessage && (
            <p className="mt-2 rounded border border-border bg-panel p-2 text-xs leading-relaxed text-muted">
              {saveMessage}
            </p>
          )}
        </aside>
      </div>

      <SavedPracticeTrades
        trades={savedPracticeTrades}
        onStatusChange={updatePracticeTradeStatus}
        onRemove={removePracticeTrade}
        onLoadNote={onUseChartContext}
      />
    </section>
  );
}

function ChartGrid({ min, max }: { min: number; max: number }) {
  const priceTicks = getPriceTicks(min, max);
  return (
    <>
      {priceTicks.map((price) => {
        const y = yFor(price, min, max);
        return (
          <g key={`p-${price}`}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y}
              y2={y}
              stroke="#174D36"
              strokeWidth="1"
              opacity="0.8"
            />
            <text
              x={WIDTH - PAD_RIGHT + 9}
              y={y + 4}
              fill="#9BAAA1"
              fontSize="10"
            >
              {formatLevel(price)}
            </text>
          </g>
        );
      })}
      {[0, 1, 2, 3, 4].map((line) => {
        const x = PAD_LEFT + line * (chartWidth() / 4);
        return (
          <line
            key={`v-${line}`}
            x1={x}
            x2={x}
            y1={PAD_TOP}
            y2={VOLUME_TOP + VOLUME_HEIGHT}
            stroke="#0D1512"
            strokeWidth="1"
          />
        );
      })}
      <line
        x1={PAD_LEFT}
        x2={WIDTH - PAD_RIGHT}
        y1={PRICE_BOTTOM}
        y2={PRICE_BOTTOM}
        stroke="#174D36"
      />
      <line
        x1={PAD_LEFT}
        x2={PAD_LEFT}
        y1={PAD_TOP}
        y2={VOLUME_TOP + VOLUME_HEIGHT}
        stroke="#174D36"
      />
      <line
        x1={WIDTH - PAD_RIGHT}
        x2={WIDTH - PAD_RIGHT}
        y1={PAD_TOP}
        y2={VOLUME_TOP + VOLUME_HEIGHT}
        stroke="#174D36"
      />
      <text x={PAD_LEFT} y={VOLUME_TOP + 11} fill="#9BAAA1" fontSize="10">
        VOL
      </text>
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
  const step = chartWidth() / candles.length;
  return (
    <>
      {candles.map((candle, index) => {
        const x = PAD_LEFT + step * index + step / 2;
        const openY = yFor(candle.open, min, max);
        const closeY = yFor(candle.close, min, max);
        const highY = yFor(candle.high, min, max);
        const lowY = yFor(candle.low, min, max);
        const up = candle.close >= candle.open;
        const color = up ? "#22C55E" : "#EF4444";
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

function VolumeLayer({ candles }: { candles: WorkspaceCandle[] }) {
  const volumes = candles.map(syntheticVolume);
  const maxVolume = Math.max(...volumes);
  const step = chartWidth() / candles.length;

  return (
    <>
      {candles.map((candle, index) => {
        const up = candle.close >= candle.open;
        const barHeight = Math.max(4, (volumes[index] / maxVolume) * (VOLUME_HEIGHT - 12));
        const x = PAD_LEFT + step * index + step / 2;
        return (
          <rect
            key={`v-${candle.open}-${index}`}
            x={x - Math.min(10, step * 0.36)}
            y={VOLUME_TOP + VOLUME_HEIGHT - barHeight}
            width={Math.max(3, Math.min(20, step * 0.72))}
            height={barHeight}
            fill={up ? "#22C55E" : "#EF4444"}
            opacity="0.24"
          />
        );
      })}
    </>
  );
}

function CurrentPriceLine({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const y = yFor(value, min, max);

  return (
    <g pointerEvents="none">
      <line
        x1={PAD_LEFT}
        x2={WIDTH - PAD_RIGHT}
        y1={y}
        y2={y}
        stroke="#D6A84F"
        strokeDasharray="4 5"
        strokeWidth="1.3"
        opacity="0.9"
      />
      <rect
        x={WIDTH - PAD_RIGHT + 5}
        y={y - 11}
        width="62"
        height="22"
        rx="4"
        fill="#D6A84F"
      />
      <text
        x={WIDTH - PAD_RIGHT + 36}
        y={y + 4}
        fill="#050807"
        fontSize="10"
        textAnchor="middle"
      >
        {value.toFixed(2)}
      </text>
    </g>
  );
}

function LastPriceCallout({
  candle,
  candles,
  min,
  max,
}: {
  candle: WorkspaceCandle;
  candles: WorkspaceCandle[];
  min: number;
  max: number;
}) {
  const step = chartWidth() / candles.length;
  const x = PAD_LEFT + step * (candles.length - 1) + step / 2;
  const y = yFor(candle.close, min, max);
  const up = candle.close >= candle.open;
  const fill = up ? "#22C55E" : "#EF4444";
  const labelX = Math.min(WIDTH - PAD_RIGHT - 112, x + 18);
  const labelY = clamp(y - 32, PAD_TOP + 4, PRICE_BOTTOM - 28);

  return (
    <g pointerEvents="none">
      <circle
        cx={x}
        cy={y}
        r="4.5"
        fill={fill}
        stroke="#E7FFF3"
        strokeWidth="1.2"
      />
      <line
        x1={x + 5}
        x2={labelX}
        y1={y}
        y2={labelY + 12}
        stroke={fill}
        strokeWidth="1.2"
        opacity="0.85"
      />
      <rect
        x={labelX}
        y={labelY}
        width="112"
        height="25"
        rx="5"
        fill="#0D1512"
        stroke={fill}
        opacity="0.96"
      />
      <text
        x={labelX + 56}
        y={labelY + 16}
        fill="#E7FFF3"
        fontSize="11"
        fontWeight="600"
        textAnchor="middle"
      >
        Current price {candle.close.toFixed(2)}
      </text>
    </g>
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
        x1={PAD_LEFT}
        x2={WIDTH - PAD_RIGHT}
        y1={y}
        y2={y}
        stroke={style.color}
        strokeWidth={active ? "3.5" : "2"}
        strokeDasharray={id === "invalidation" ? "7 6" : undefined}
      />
      <rect
        x={WIDTH - PAD_RIGHT - 128}
        y={y - 13}
        width="128"
        height="26"
        rx="5"
        fill="#0D1512"
        stroke={style.color}
        opacity="0.95"
      />
      <text
        x={WIDTH - PAD_RIGHT - 8}
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

function TimeAxis({ candles }: { candles: WorkspaceCandle[] }) {
  const markers = [0, Math.floor(candles.length * 0.25), Math.floor(candles.length * 0.5), Math.floor(candles.length * 0.75), candles.length - 1];
  const step = chartWidth() / candles.length;

  return (
    <g pointerEvents="none">
      {markers.map((index) => {
        const x = PAD_LEFT + step * index + step / 2;
        return (
          <text
            key={`t-${index}`}
            x={x}
            y={HEIGHT - 12}
            fill="#9BAAA1"
            fontSize="10"
            textAnchor="middle"
          >
            {formatCandleMarker(index, candles.length)}
          </text>
        );
      })}
    </g>
  );
}

function CrosshairLayer({
  crosshair,
}: {
  crosshair: {
    x: number;
    y: number;
    price: number;
    candleIndex: number;
  } | null;
}) {
  if (!crosshair) return null;

  return (
    <g pointerEvents="none">
      <line
        x1={crosshair.x}
        x2={crosshair.x}
        y1={PAD_TOP}
        y2={VOLUME_TOP + VOLUME_HEIGHT}
        stroke="#E7FFF3"
        strokeWidth="1"
        strokeDasharray="3 5"
        opacity="0.42"
      />
      <line
        x1={PAD_LEFT}
        x2={WIDTH - PAD_RIGHT}
        y1={crosshair.y}
        y2={crosshair.y}
        stroke="#E7FFF3"
        strokeWidth="1"
        strokeDasharray="3 5"
        opacity="0.42"
      />
      <rect
        x={WIDTH - PAD_RIGHT + 5}
        y={crosshair.y - 10}
        width="62"
        height="20"
        rx="4"
        fill="#174D36"
        stroke="#35FF9A"
      />
      <text
        x={WIDTH - PAD_RIGHT + 36}
        y={crosshair.y + 4}
        fill="#E7FFF3"
        fontSize="10"
        textAnchor="middle"
      >
        {crosshair.price.toFixed(2)}
      </text>
      <rect
        x={crosshair.x - 22}
        y={HEIGHT - 28}
        width="44"
        height="18"
        rx="4"
        fill="#174D36"
        stroke="#35FF9A"
      />
      <text
        x={crosshair.x}
        y={HEIGHT - 15}
        fill="#E7FFF3"
        fontSize="10"
        textAnchor="middle"
      >
        {formatCandleMarker(crosshair.candleIndex, 28)}
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

function isPracticeTradeSnapshot(value: unknown): value is PracticeTradeSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PracticeTradeSnapshot>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.savedAt === "string" &&
    typeof candidate.pair === "string" &&
    typeof candidate.timeframe === "string" &&
    typeof candidate.currentPrice === "number" &&
    candidate.levels !== undefined &&
    typeof candidate.chartNote === "string"
  );
}

function SavedPracticeTrades({
  trades,
  onStatusChange,
  onRemove,
  onLoadNote,
}: {
  trades: PracticeTradeSnapshot[];
  onStatusChange: (id: string, status: PracticeTradeStatus) => void;
  onRemove: (id: string) => void;
  onLoadNote: (note: string) => void;
}) {
  return (
    <section className="mt-4 rounded border border-border bg-bg p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Saved practice trades
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Save the chart idea before you know the outcome. Later, this becomes
            the paid cloud journal and review library.
          </p>
        </div>
        <span className="shrink-0 rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
          local v1 / {trades.length} saved
        </span>
      </div>

      {trades.length === 0 ? (
        <p className="mt-3 rounded border border-border bg-panel p-3 text-xs leading-relaxed text-muted">
          No practice trades saved yet. Adjust the levels, check the readout,
          then save the idea before building the plan.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {trades.map((trade) => (
            <li key={trade.id} className="rounded border border-border bg-panel p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-sm font-semibold text-ink">
                    {trade.pair} / {trade.timeframe}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {trade.patternLabel} / saved {formatSavedAt(trade.savedAt)}
                  </div>
                </div>
                <label className="block">
                  <span className="sr-only">Practice trade status</span>
                  <select
                    value={trade.status}
                    onChange={(event) =>
                      onStatusChange(
                        trade.id,
                        event.target.value as PracticeTradeStatus
                      )
                    }
                    className="rounded border border-border bg-bg px-2 py-1 text-[11px] text-ink"
                  >
                    {(
                      [
                        "watching",
                        "paper-entered",
                        "reviewed",
                        "skipped",
                      ] as PracticeTradeStatus[]
                    ).map((status) => (
                      <option key={status} value={status}>
                        {getPracticeTradeStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted">
                {summarizePracticeTrade(trade)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                <span className="text-ink">Read:</span> {trade.read.quality}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onLoadNote(trade.chartNote)}
                  className="rounded border border-accent/50 px-3 py-2 text-xs font-medium text-accent hover:border-accent"
                >
                  Load note into plan
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(trade.id)}
                  className="rounded border border-border px-3 py-2 text-xs text-muted hover:border-danger/60 hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function yFor(price: number, min: number, max: number): number {
  const pct = (price - min) / (max - min);
  return PRICE_BOTTOM - pct * (PRICE_BOTTOM - PAD_TOP);
}

function priceForY(y: number, min: number, max: number): number {
  const clampedY = clamp(y, PAD_TOP, PRICE_BOTTOM);
  const pct = (PRICE_BOTTOM - clampedY) / (PRICE_BOTTOM - PAD_TOP);
  return min + pct * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampIndex(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, value));
}

function chartWidth(): number {
  return WIDTH - PAD_LEFT - PAD_RIGHT;
}

function getPriceTicks(min: number, max: number): number[] {
  const count = 6;
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) =>
    Number((max - step * index).toFixed(2))
  );
}

function formatLevel(value: number): string {
  return value >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : value.toFixed(2);
}

function formatSigned(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function formatCandleMarker(index: number, total: number): string {
  const remaining = total - index - 1;
  return remaining <= 0 ? "now" : `-${remaining}`;
}

function syntheticVolume(candle: WorkspaceCandle, index: number): number {
  const range = candle.high - candle.low;
  const body = Math.abs(candle.close - candle.open);
  return range * 120 + body * 90 + (index % 6) * 12 + 20;
}
