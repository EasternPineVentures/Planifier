"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { format, formatDistanceToNow } from "date-fns";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/lib/market/kraken";
import {
  detectTrend,
  findSupportResistance,
  buildTechnicalIndicatorRead,
  buildTechnicalIndicatorSeries,
  locatePriceInStructure,
  type TechnicalIndicatorRead,
  type TechnicalIndicatorSeries,
  type StructureLocation,
  type TrendDirection,
} from "@/lib/market/technical";
import {
  DEFAULT_LEARNING_PAIR,
  DEFAULT_LEARNING_TIMEFRAME,
  LEARNING_CHART_PAIRS,
  LEARNING_CHART_TIMEFRAMES,
  buildTradingViewChartUrl,
  calculateRiskReward,
  explainLearningCandle,
  findLearningChartPair,
  formatPrice,
  normalizeLearningChartTimeframe,
  summarizeLatestPrice,
  type LearningChartPair,
  type LearningChartTimeframe,
  type LearningOhlcPayload,
  type PracticeLevels,
  type RiskRewardReadout,
} from "@/lib/market/learningChart";

const POLL_MS = 20_000;

type LevelKey = keyof PracticeLevels;
type PracticeDirection = "long" | "short";

type EmaChartMarker = {
  key: "ema20" | "ema50";
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
  align: "left" | "right";
};

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string | null;
  planId: string | null;
};

const LEVEL_STYLES: Record<
  LevelKey,
  { label: string; color: string; lineStyle: LineStyle }
> = {
  entry: { label: "Entry", color: "#D6A84F", lineStyle: LineStyle.Solid },
  stop: { label: "Stop loss", color: "#EF4444", lineStyle: LineStyle.Dashed },
  target: { label: "Target", color: "#35FF9A", lineStyle: LineStyle.Solid },
};

export default function LearningChartWorkspace({
  initialPair,
  initialTimeframe,
  onUseChartContext,
}: {
  initialPair?: string;
  initialTimeframe?: string;
  onUseChartContext?: (note: string) => void;
} = {}) {
  const [pair, setPair] = useState(() => getInitialPairFromUrl(initialPair));
  const [timeframe, setTimeframe] = useState<LearningChartTimeframe>(
    () => getInitialTimeframeFromUrl(initialTimeframe)
  );
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [practiceDirection, setPracticeDirection] =
    useState<PracticeDirection>("long");
  const [levels, setLevels] = useState<PracticeLevels>({
    entry: null,
    stop: null,
    target: null,
  });
  const [saveState, setSaveState] = useState<SaveState>({
    status: "idle",
    message: null,
    planId: null,
  });
  const [previewExample, setPreviewExample] =
    useState<HistoricalExample | null>(null);
  const syncedInitialPairRef = useRef(initialPair);
  const syncedInitialTimeframeRef = useRef(initialTimeframe);

  const selectedPair =
    LEARNING_CHART_PAIRS.find((item) => item.symbol === pair) ??
    DEFAULT_LEARNING_PAIR;

  const selectedIndex = useMemo(
    () => candles.findIndex((candle) => candle.time === selectedTime),
    [candles, selectedTime]
  );
  const selectedCandle =
    selectedIndex >= 0 ? candles[selectedIndex] : candles.at(-1) ?? null;
  const previousCandle =
    selectedIndex > 0
      ? candles[selectedIndex - 1]
      : selectedIndex === -1
      ? candles.at(-2) ?? null
      : null;
  const latestRead = useMemo(() => summarizeLatestPrice(candles), [candles]);
  const riskReward = useMemo(() => calculateRiskReward(levels), [levels]);
  const indicatorSeries = useMemo(
    () => buildTechnicalIndicatorSeries(candles),
    [candles]
  );
  const historicalExamples = useMemo(
    () => buildHistoricalExamples(candles),
    [candles]
  );
  const structureCandles = useMemo(() => {
    if (selectedIndex >= 0) return candles.slice(0, selectedIndex + 1);
    return candles;
  }, [candles, selectedIndex]);
  const structureRead = useMemo(
    () => buildStructureRead(structureCandles, selectedCandle),
    [structureCandles, selectedCandle]
  );
  const indicatorRead = useMemo(
    () => buildTechnicalIndicatorRead(structureCandles),
    [structureCandles]
  );
  const chartContextNote = useMemo(
    () =>
      buildLearningChartContextNote({
        pair: selectedPair,
        timeframe,
        selectedCandle,
        structure: structureRead,
        indicators: indicatorRead,
        practiceDirection,
        levels,
        riskReward,
      }),
    [
      indicatorRead,
      levels,
      practiceDirection,
      riskReward,
      selectedCandle,
      selectedPair,
      structureRead,
      timeframe,
    ]
  );

  const loadCandles = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoadState("loading");
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          pair,
          timeframe,
          limit: "240",
        });
        const response = await fetch(`/api/market/ohlc?${params}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as
          | LearningOhlcPayload
          | { error?: string; message?: string };

        if (!response.ok) {
          const problem = payload as { error?: string; message?: string };
          throw new Error(
            problem.message ?? problem.error ?? "Market candles were not available."
          );
        }

        if (!("candles" in payload)) {
          throw new Error(
            "Market candles were not available."
          );
        }

        setCandles(payload.candles);
        setGeneratedAt(payload.generatedAt);
        setSelectedTime((current) => {
          if (
            current &&
            payload.candles.some((candle) => candle.time === current)
          ) {
            return current;
          }
          return null;
        });
        setLoadState("ready");
      } catch (caught) {
        setLoadState("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "The chart could not load public market candles."
        );
      }
    },
    [pair, timeframe]
  );

  useEffect(() => {
    setCandles([]);
    setGeneratedAt(null);
    setSelectedTime(null);
    setLevels({ entry: null, stop: null, target: null });
    setSaveState({ status: "idle", message: null, planId: null });
  }, [pair, timeframe]);

  useEffect(() => {
    if (initialPair === syncedInitialPairRef.current) return;
    syncedInitialPairRef.current = initialPair;
    const nextPair = findLearningChartPair(initialPair)?.symbol;
    if (nextPair) setPair(nextPair);
  }, [initialPair]);

  useEffect(() => {
    if (initialTimeframe === syncedInitialTimeframeRef.current) return;
    syncedInitialTimeframeRef.current = initialTimeframe;
    if (initialTimeframe) {
      setTimeframe(normalizeLearningChartTimeframe(initialTimeframe));
    }
  }, [initialTimeframe]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("pair", pair);
    url.searchParams.set("timeframe", timeframe);
    window.history.replaceState(null, "", url.toString());
  }, [pair, timeframe]);

  useEffect(() => {
    void loadCandles();
    const id = window.setInterval(() => {
      void loadCandles({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [loadCandles]);

  function changePracticeDirection(direction: PracticeDirection) {
    setPracticeDirection(direction);
    setSaveState({ status: "idle", message: null, planId: null });
  }

  function updateLevel(key: LevelKey, value: string) {
    const next = Number(value);
    setLevels((current) => ({
      ...current,
      [key]: Number.isFinite(next) ? next : null,
    }));
  }

  function useSelectedCloseFor(key: LevelKey) {
    if (!selectedCandle) return;
    setLevels((current) => ({
      ...current,
      [key]: selectedCandle.close,
    }));
  }

  async function saveChartPlan() {
    if (
      riskReward.status !== "valid" ||
      levels.entry === null ||
      levels.stop === null ||
      levels.target === null
    ) {
      setSaveState({
        status: "error",
        message: "Set a valid entry, stop, and target before saving.",
        planId: null,
      });
      return;
    }

    setSaveState({ status: "saving", message: "Saving plan...", planId: null });
    try {
      const selectedCandleTime = selectedCandle
        ? format(new Date(selectedCandle.time * 1000), "MMM d, yyyy h:mm a")
        : null;
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedPair.symbol,
          timeframe,
          entry: levels.entry,
          stop: levels.stop,
          target: levels.target,
          riskReward: riskReward.ratio,
          currentPrice: latestRead.last?.close ?? null,
          selectedCandleTime,
          notes: `Selected ${practiceDirection} practice map. ${riskReward.explanation}`,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;

      if (response.status === 401) {
        throw new Error("Sign in to save chart plans to My Plans.");
      }
      if (!response.ok || !payload?.id) {
        throw new Error(payload?.error ?? "Plan could not be saved.");
      }

      setSaveState({
        status: "saved",
        message: "Saved to My Plans.",
        planId: payload.id,
      });
    } catch (caught) {
      setSaveState({
        status: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Plan could not be saved.",
        planId: null,
      });
    }
  }

  return (
    <section className="epv-panel-strong overflow-hidden">
      <div className="data-grid border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="epv-kicker">
              Learning Chart V1
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold leading-none tracking-normal text-ink sm:text-4xl">
              Read the chart before you write the plan.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              Public Kraken candles, simple levels, plain-English candle reads,
              and practice R/R. Educational only. No execution, no trade calls.
            </p>
          </div>
          <LiveStatus
            state={loadState}
            generatedAt={generatedAt}
            onRefresh={() => void loadCandles()}
          />
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <ChartControls
          pair={pair}
          selectedPair={selectedPair}
          timeframe={timeframe}
          practiceDirection={practiceDirection}
          beginnerMode={beginnerMode}
          onPairChange={setPair}
          onTimeframeChange={setTimeframe}
          onPracticeDirectionChange={changePracticeDirection}
          onBeginnerModeChange={setBeginnerMode}
        />

        {error && (
          <div className="rounded border border-danger/50 bg-danger/10 p-3 text-sm leading-relaxed text-ink">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <PlanLevelControls
            practiceDirection={practiceDirection}
            levels={levels}
            riskReward={riskReward}
            saveState={saveState}
            selectedCandle={selectedCandle}
            onLevelChange={updateLevel}
            onUseSelectedClose={useSelectedCloseFor}
            onSavePlan={() => void saveChartPlan()}
          />

          <div className="overflow-hidden rounded border border-border bg-bg">
            <ChartHeader
              pair={selectedPair}
              timeframe={timeframe}
              latest={latestRead.last}
              change={latestRead.change}
              changePercent={latestRead.changePercent}
            />
            <LearningChartCanvas
              candles={candles}
              loadState={loadState}
              selectedTime={selectedTime}
              levels={levels}
              indicatorSeries={indicatorSeries}
              indicatorRead={indicatorRead}
              onSelectTime={setSelectedTime}
            />
          </div>

          {onUseChartContext && (
            <div className="rounded border border-accent/45 bg-accent/10 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                    Send to plan builder
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Load the real candle, level, and indicator read into the
                    plan form. Edit the note before saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUseChartContext(chartContextNote)}
                  className="shrink-0 rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-foxfire-gold"
                >
                  Load chart read into plan
                </button>
              </div>
            </div>
          )}

          <aside className="grid gap-4 xl:grid-cols-3">
            <LearningPanel
              pair={selectedPair}
              timeframe={timeframe}
              candle={selectedCandle}
              hasCandles={candles.length > 0}
              previous={previousCandle}
              structure={structureRead}
              beginnerMode={beginnerMode}
            />
            <IndicatorReadPanel read={indicatorRead} beginnerMode={beginnerMode} />
            <ChartBasics beginnerMode={beginnerMode} />
          </aside>
        </div>

        <HistoricalExamples
          examples={historicalExamples}
          pair={selectedPair}
          timeframe={timeframe}
          candles={candles}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          onPreviewExample={setPreviewExample}
        />

        {previewExample && (
          <MiniChartModal
            example={previewExample}
            pair={selectedPair}
            timeframe={timeframe}
            candles={candles}
            onInspectMainChart={(time) => {
              setSelectedTime(time);
              setPreviewExample(null);
            }}
            onClose={() => setPreviewExample(null)}
          />
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3 text-[11px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Market data: Kraken public OHLC. Charting library:{" "}
            <a
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-foxfire-gold"
            >
              TradingView Lightweight Charts
            </a>
            .
          </p>
          <p>Future path: WebSocket candles for faster updates.</p>
        </div>
      </div>
    </section>
  );
}

function ChartControls({
  pair,
  selectedPair,
  timeframe,
  practiceDirection,
  beginnerMode,
  onPairChange,
  onTimeframeChange,
  onPracticeDirectionChange,
  onBeginnerModeChange,
}: {
  pair: string;
  selectedPair: LearningChartPair;
  timeframe: LearningChartTimeframe;
  practiceDirection: PracticeDirection;
  beginnerMode: boolean;
  onPairChange: (pair: string) => void;
  onTimeframeChange: (timeframe: LearningChartTimeframe) => void;
  onPracticeDirectionChange: (direction: PracticeDirection) => void;
  onBeginnerModeChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded border border-border bg-bg p-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(180px,260px)_minmax(260px,1fr)_minmax(220px,260px)_auto] xl:items-end">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
            Pair
          </span>
          <select
            value={pair}
            onChange={(event) => onPairChange(event.target.value)}
            className="mt-1 w-full rounded border border-border bg-panel px-3 py-2 text-sm text-ink outline-none hover:border-muted focus:border-accent"
          >
            {LEARNING_CHART_PAIRS.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol} - {item.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Timeframe
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {LEARNING_CHART_TIMEFRAMES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onTimeframeChange(item)}
                className={`rounded border px-3 py-2 font-mono text-[11px] uppercase ${
                  timeframe === item
                    ? "border-accent bg-accent/20 text-ink"
                    : "border-border bg-panel text-muted hover:border-muted hover:text-ink"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Practice direction
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 rounded border border-border bg-panel p-1">
            {(["long", "short"] as PracticeDirection[]).map((direction) => (
              <button
                key={direction}
                type="button"
                aria-pressed={practiceDirection === direction}
                onClick={() => onPracticeDirectionChange(direction)}
                className={`rounded px-3 py-2 font-mono text-[11px] uppercase ${
                  practiceDirection === direction
                    ? direction === "long"
                      ? "bg-success/20 text-success"
                      : "bg-danger/20 text-danger"
                    : "text-muted hover:text-ink"
                }`}
              >
                {direction}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded border border-border bg-panel px-3 py-2">
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
              Beginner
            </span>
            <span className="text-xs text-ink">
              {beginnerMode ? "Explain reads" : "Compact reads"}
            </span>
          </span>
          <input
            type="checkbox"
            checked={beginnerMode}
            onChange={(event) => onBeginnerModeChange(event.target.checked)}
            className="h-5 w-5 accent-accent"
          />
        </label>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {selectedPair.label} on Kraken public candles. Start with the close,
        then compare the body, wicks, level location, and volume.
      </p>
    </div>
  );
}

function LiveStatus({
  state,
  generatedAt,
  onRefresh,
}: {
  state: "loading" | "ready" | "error";
  generatedAt: string | null;
  onRefresh: () => void;
}) {
  const label =
    state === "loading"
      ? "Loading candles"
      : generatedAt
      ? `Updated ${formatDistanceToNow(new Date(generatedAt), {
          addSuffix: true,
        })}`
      : "Ready";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded border px-2 py-1 font-mono text-[10px] uppercase ${
          state === "error"
            ? "border-danger/50 text-danger"
            : "border-success/50 text-success"
        }`}
      >
        Kraken live
      </span>
      <span className="text-xs text-muted">{label}</span>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded border border-border px-3 py-2 text-xs font-medium text-ink hover:border-muted"
      >
        Refresh
      </button>
    </div>
  );
}

function ChartHeader({
  pair,
  timeframe,
  latest,
  change,
  changePercent,
}: {
  pair: LearningChartPair;
  timeframe: LearningChartTimeframe;
  latest: Candle | null;
  change: number;
  changePercent: number;
}) {
  const positive = change >= 0;
  return (
    <div className="border-b border-border bg-panel/80 px-3 py-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-ink">
            {pair.symbol}
          </span>
          <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
            {timeframe}
          </span>
          <span className="rounded border border-amber/40 px-2 py-1 font-mono text-[10px] uppercase text-amber">
            public OHLC
          </span>
        </div>
        {latest && (
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted">
            <span>
              O <span className="text-ink">{formatPrice(latest.open)}</span>
            </span>
            <span>
              H <span className="text-ink">{formatPrice(latest.high)}</span>
            </span>
            <span>
              L <span className="text-ink">{formatPrice(latest.low)}</span>
            </span>
            <span>
              C <span className="text-ink">{formatPrice(latest.close)}</span>
            </span>
            <span className={positive ? "text-success" : "text-danger"}>
              {formatSigned(change)} / {formatSigned(changePercent)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LearningChartCanvas({
  candles,
  loadState,
  selectedTime,
  levels,
  indicatorSeries,
  indicatorRead,
  onSelectTime,
}: {
  candles: Candle[];
  loadState: "loading" | "ready" | "error";
  selectedTime: number | null;
  levels: PracticeLevels;
  indicatorSeries: TechnicalIndicatorSeries;
  indicatorRead: TechnicalIndicatorRead;
  onSelectTime: (time: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const ema20Ref = useRef<ISeriesApi<"Line", Time> | null>(null);
  const ema50Ref = useRef<ISeriesApi<"Line", Time> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram", Time> | null>(null);
  const priceLinesRef = useRef<Partial<Record<LevelKey, IPriceLine>>>({});
  const indicatorSeriesRef = useRef(indicatorSeries);
  const selectRef = useRef(onSelectTime);
  const [emaMarkers, setEmaMarkers] = useState<EmaChartMarker[]>([]);

  useEffect(() => {
    selectRef.current = onSelectTime;
  }, [onSelectTime]);

  useEffect(() => {
    indicatorSeriesRef.current = indicatorSeries;
  }, [indicatorSeries]);

  const updateEmaMarkers = useCallback(() => {
    const chart = chartRef.current;
    const ema20Series = ema20Ref.current;
    const ema50Series = ema50Ref.current;
    const container = containerRef.current;
    if (!chart || !ema20Series || !ema50Series || !container) {
      setEmaMarkers([]);
      return;
    }

    const markerInputs = [
      {
        key: "ema20" as const,
        label: "EMA20",
        color: "#D6A84F",
        series: ema20Series,
        point: indicatorSeriesRef.current.ema20.at(-1),
      },
      {
        key: "ema50" as const,
        label: "EMA50",
        color: "#6F8F72",
        series: ema50Series,
        point: indicatorSeriesRef.current.ema50.at(-1),
      },
    ];

    const width = container.clientWidth;
    const nextMarkers = markerInputs.flatMap((item): EmaChartMarker[] => {
      if (!item.point) return [];
      const x = chart.timeScale().timeToCoordinate(item.point.time as UTCTimestamp);
      const y = item.series.priceToCoordinate(item.point.value);
      if (x === null || y === null) return [];
      return [
        {
          key: item.key,
          label: item.label,
          value: item.point.value,
          color: item.color,
          x,
          y,
          align: x > width - 150 ? "left" : "right",
        },
      ];
    });

    setEmaMarkers(nextMarkers);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 700,
      autoSize: false,
      layout: {
        background: { type: ColorType.Solid, color: "#050807" },
        textColor: "#9BAAA1",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "rgba(23, 77, 54, 0.35)" },
        horzLines: { color: "rgba(23, 77, 54, 0.58)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(231, 255, 243, 0.42)" },
        horzLine: { color: "rgba(231, 255, 243, 0.42)" },
      },
      rightPriceScale: {
        borderColor: "#174D36",
        textColor: "#9BAAA1",
      },
      timeScale: {
        borderColor: "#174D36",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderUpColor: "#22C55E",
      borderDownColor: "#EF4444",
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
      priceLineColor: "#D6A84F",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    series.priceScale().applyOptions({
      scaleMargins: { top: 0.08, bottom: 0.25 },
    });

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#D6A84F",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "EMA 20",
    });
    const ema50Series = chart.addSeries(LineSeries, {
      color: "#6F8F72",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "EMA 50",
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(111, 143, 114, 0.24)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    ema20Ref.current = ema20Series;
    ema50Ref.current = ema50Series;
    volumeRef.current = volumeSeries;

    const handleCrosshairMove = (params: { time?: Time }) => {
      if (typeof params.time === "number") {
        selectRef.current(params.time);
      }
    };
    const handleVisibleRangeChange = () => updateEmaMarkers();
    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextHeight =
        entry.contentRect.width < 640
          ? 500
          : entry.contentRect.width < 960
          ? 620
          : 700;
      chart.applyOptions({
        width: Math.floor(entry.contentRect.width),
        height: nextHeight,
      });
      window.requestAnimationFrame(updateEmaMarkers);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      ema20Ref.current = null;
      ema50Ref.current = null;
      volumeRef.current = null;
      priceLinesRef.current = {};
    };
  }, [updateEmaMarkers]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || candles.length === 0) return;

    const data: CandlestickData<UTCTimestamp>[] = candles.map((candle) => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    series.setData(data);
    series.update(data[data.length - 1]);
    chart.timeScale().fitContent();
    window.requestAnimationFrame(updateEmaMarkers);
  }, [candles, updateEmaMarkers]);

  useEffect(() => {
    const ema20 = ema20Ref.current;
    const ema50 = ema50Ref.current;
    const volume = volumeRef.current;
    if (!ema20 || !ema50 || !volume) return;

    ema20.setData(toLineData(indicatorSeries.ema20));
    ema50.setData(toLineData(indicatorSeries.ema50));
    volume.setData(
      candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        value: candle.volume,
        color:
          candle.close >= candle.open
            ? "rgba(34, 197, 94, 0.26)"
            : "rgba(239, 68, 68, 0.24)",
      }))
    );
    window.requestAnimationFrame(updateEmaMarkers);
  }, [candles, indicatorSeries, updateEmaMarkers]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    Object.values(priceLinesRef.current).forEach((line) => {
      if (line) series.removePriceLine(line);
    });

    priceLinesRef.current = {};
    (Object.keys(LEVEL_STYLES) as LevelKey[]).forEach((key) => {
      const price = levels[key];
      if (typeof price !== "number" || !Number.isFinite(price)) return;
      const style = LEVEL_STYLES[key];
      priceLinesRef.current[key] = series.createPriceLine({
        price,
        color: style.color,
        lineWidth: 2,
        lineStyle: style.lineStyle,
        axisLabelVisible: true,
        title: style.label,
      });
    });
  }, [levels]);

  const selectedCandle = candles.find((candle) => candle.time === selectedTime);
  const emptyChartMessage =
    loadState === "error"
      ? "Public candle data is unavailable. Try Refresh."
      : "Loading public market candles...";

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[500px] w-full sm:h-[620px] lg:h-[700px]" />
      <EmaChartMarkers markers={emaMarkers} />
      <IndicatorLegend read={indicatorRead} />
      {candles.length === 0 && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-bg/86 p-4 text-center">
          <div>
            <p className="epv-kicker">Chart data</p>
            <p className="mt-2 text-sm text-muted">{emptyChartMessage}</p>
          </div>
        </div>
      )}
      {selectedCandle && (
        <div className="pointer-events-none absolute left-3 top-3 rounded border border-border bg-panel/95 px-3 py-2 font-mono text-[10px] uppercase text-muted shadow-lg">
          Inspecting {format(new Date(selectedCandle.time * 1000), "MMM d, h:mm a")} / C{" "}
          <span className="text-ink">{formatPrice(selectedCandle.close)}</span>
        </div>
      )}
    </div>
  );
}

function IndicatorLegend({ read }: { read: TechnicalIndicatorRead }) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1 rounded border border-border bg-panel/95 px-2 py-1.5 font-mono text-[10px] uppercase text-muted shadow-lg">
      <span className="text-accent">RSI {formatOptionalNumber(read.rsi14)}</span>
      <span>ATR {formatOptionalPrice(read.atr14)}</span>
    </div>
  );
}

function EmaChartMarkers({ markers }: { markers: EmaChartMarker[] }) {
  if (markers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {markers.map((marker) => (
        <div
          key={marker.key}
          className={`absolute left-0 top-0 flex items-center gap-1 ${
            marker.align === "left" ? "flex-row-reverse" : ""
          }`}
          style={{
            transform:
              marker.align === "left"
                ? `translate(${marker.x}px, ${marker.y}px) translate(-100%, -50%)`
                : `translate(${marker.x}px, ${marker.y}px) translate(0, -50%)`,
          }}
        >
          <span
            className="h-3 w-3 rounded-full border border-bg shadow-[0_0_0_2px_rgba(5,8,7,0.7)]"
            style={{ backgroundColor: marker.color }}
          />
          <span
            className="rounded border bg-bg/95 px-2 py-1 font-mono text-[10px] uppercase shadow-lg"
            style={{ borderColor: marker.color, color: marker.color }}
          >
            {marker.label} {formatPrice(marker.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function IndicatorReadPanel({
  read,
  beginnerMode,
}: {
  read: TechnicalIndicatorRead;
  beginnerMode: boolean;
}) {
  return (
    <section className="rounded border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Indicator read
          </div>
          <h2 className="mt-2 text-lg font-semibold text-ink">
            Trend, momentum, volatility, participation.
          </h2>
        </div>
        <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
          real math
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase text-muted">
        <Metric label="EMA 20" value={formatOptionalPrice(read.ema20)} />
        <Metric label="EMA 50" value={formatOptionalPrice(read.ema50)} />
        <Metric label="RSI 14" value={formatOptionalNumber(read.rsi14)} />
        <Metric label="ATR 14" value={formatOptionalPrice(read.atr14)} />
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
        <ReadBlock label={read.trend.label} value={read.trend.explanation} />
        <ReadBlock
          label={read.momentum.label}
          value={read.momentum.explanation}
        />
        <ReadBlock
          label={read.volatility.label}
          value={read.volatility.explanation}
        />
        <ReadBlock
          label={read.participation.label}
          value={read.participation.explanation}
        />
      </div>

      {beginnerMode && (
        <p className="mt-4 rounded border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-muted">
          {read.planQuestion}
        </p>
      )}
    </section>
  );
}

function PlanLevelControls({
  practiceDirection,
  levels,
  riskReward,
  saveState,
  selectedCandle,
  onLevelChange,
  onUseSelectedClose,
  onSavePlan,
}: {
  practiceDirection: PracticeDirection;
  levels: PracticeLevels;
  riskReward: RiskRewardReadout;
  saveState: SaveState;
  selectedCandle: Candle | null;
  onLevelChange: (key: LevelKey, value: string) => void;
  onUseSelectedClose: (key: LevelKey) => void;
  onSavePlan: () => void;
}) {
  const directionMismatch =
    riskReward.direction !== null && riskReward.direction !== practiceDirection;

  return (
    <div className="rounded border border-border bg-bg p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
              Risk vs Reward Calculator
            </div>
            <span
              className={`rounded border px-2 py-1 font-mono text-[10px] uppercase ${
                practiceDirection === "long"
                  ? "border-success/45 text-success"
                  : "border-danger/45 text-danger"
              }`}
            >
              {practiceDirection} map
            </span>
          </div>
          <h2 className="font-display mt-2 text-2xl font-semibold leading-none text-ink">
            Check the math before the plan.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Already have levels in mind? Enter the entry, target, and stop loss
            to see the R/R before you turn the idea into a paper plan.
          </p>
        </div>
        <div
          className={`rounded border px-3 py-2 text-right ${
            riskReward.status === "valid"
              ? "border-success/50 bg-success/10"
              : riskReward.status === "invalid"
              ? "border-danger/50 bg-danger/10"
              : "border-border bg-panel"
          }`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            R/R
          </div>
          <div className="text-lg font-semibold text-ink">{riskReward.label}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {(Object.keys(LEVEL_STYLES) as LevelKey[]).map((key) => (
          <label key={key} className="rounded border border-border bg-panel p-3">
            <span
              className="block font-mono text-[10px] uppercase tracking-wider"
              style={{ color: LEVEL_STYLES[key].color }}
            >
              {LEVEL_STYLES[key].label}
            </span>
            <input
              type="number"
              value={levels[key] ?? ""}
              onChange={(event) => onLevelChange(key, event.target.value)}
              className="mt-2 w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              placeholder="price"
              step="0.01"
            />
            <button
              type="button"
              disabled={!selectedCandle}
              onClick={() => onUseSelectedClose(key)}
              className="mt-2 w-full rounded border border-border px-2 py-2 text-xs text-muted hover:border-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
            >
              {selectedCandle ? "Use selected close" : "Select candle first"}
            </button>
          </label>
        ))}
      </div>

      <p className="mt-3 rounded border border-border bg-panel p-3 text-xs leading-relaxed text-muted">
        {riskReward.explanation} This calculator only checks the distance
        between your levels. It does not tell you whether the setup is good.
      </p>
      {directionMismatch && (
        <p className="mt-2 rounded border border-amber/45 bg-amber/10 p-3 text-xs leading-relaxed text-muted">
          The selected map is {practiceDirection}, but the current target and
          stop read as {riskReward.direction}. Flip the direction or adjust the
          levels before saving.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 rounded border border-border bg-panel p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Save practice plan
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Saves the levels as an educational plan you can review and journal
            later. It does not place a trade.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <SignedIn>
            <button
              type="button"
              onClick={onSavePlan}
              disabled={saveState.status === "saving"}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-foxfire-gold disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saveState.status === "saving" ? "Saving..." : "Save plan"}
            </button>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded border border-accent/60 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:border-accent"
              >
                Sign in to save
              </button>
            </SignInButton>
          </SignedOut>
          {saveState.planId && (
            <a
              href={`/plans/${saveState.planId}`}
              className="text-xs text-accent hover:text-foxfire-gold"
            >
              Open saved plan
            </a>
          )}
        </div>
      </div>
      {saveState.message && (
        <p
          className={`mt-2 rounded border p-2 text-xs leading-relaxed ${
            saveState.status === "error"
              ? "border-danger/50 bg-danger/10 text-danger"
              : "border-success/50 bg-success/10 text-ink"
          }`}
        >
          {saveState.message}
        </p>
      )}
    </div>
  );
}

function LearningPanel({
  pair,
  timeframe,
  candle,
  hasCandles,
  previous,
  structure,
  beginnerMode,
}: {
  pair: LearningChartPair;
  timeframe: LearningChartTimeframe;
  candle: Candle | null;
  hasCandles: boolean;
  previous: Candle | null;
  structure: ChartStructureRead;
  beginnerMode: boolean;
}) {
  if (!candle) {
    return (
      <section className="rounded border border-border bg-bg p-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
          Learning panel
        </div>
        <p className="mt-2 text-sm text-muted">
          {hasCandles
            ? "Chart is clear. Move over a candle to inspect it when you are ready."
            : "Waiting for candles..."}
        </p>
      </section>
    );
  }

  const explanation = explainLearningCandle(candle, previous);

  return (
    <section className="rounded border border-border bg-bg p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
        Candle read
      </div>
      <h2 className="mt-2 text-lg font-semibold text-ink">
        {pair.symbol} / {timeframe} / {format(new Date(candle.time * 1000), "MMM d, h:mm a")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink">
        {explanation.headline}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase text-muted">
        <Metric label="Open" value={formatPrice(candle.open)} />
        <Metric label="High" value={formatPrice(candle.high)} />
        <Metric label="Low" value={formatPrice(candle.low)} />
        <Metric label="Close" value={formatPrice(candle.close)} />
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
        <ReadBlock label="Body" value={explanation.bodyRead} />
        <ReadBlock label="Wicks" value={explanation.wickRead} />
        <ReadBlock label="Volume" value={explanation.volumeRead} />
      </div>

      <div className="mt-4 rounded border border-accent/40 bg-accent/10 p-3 text-sm leading-relaxed text-muted">
        <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
          Structure basics
        </div>
        <div className="mt-3 space-y-3">
          <ReadBlock
            label="Support / resistance"
            value={formatStructureLevels(structure)}
          />
          <ReadBlock label="Trend read" value={trendCopy[structure.trend]} />
          <ReadBlock label="Location" value={locationCopy[structure.location]} />
        </div>
      </div>

      {beginnerMode && (
        <ol className="mt-4 space-y-2 border-t border-border pt-4 text-sm leading-relaxed text-muted">
          {explanation.beginnerSteps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="font-mono text-[10px] text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ChartBasics({ beginnerMode }: { beginnerMode: boolean }) {
  return (
    <section className="rounded border border-border bg-bg p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
        Charting basics
      </div>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        <ReadBlock
          label="Trend"
          value="Look for higher highs and higher lows for an uptrend, or lower highs and lower lows for a downtrend."
        />
        <ReadBlock
          label="Level"
          value="Support and resistance are areas, not magic exact prices. The more clean reactions, the more worth watching."
        />
        <ReadBlock
          label="Location"
          value="Ideas are usually clearer near important levels. The middle of a range is often lower quality."
        />
        <ReadBlock
          label="Invalidation"
          value="Know the price area that would prove the practice idea wrong before thinking about reward."
        />
      </div>
      {beginnerMode && (
        <p className="mt-3 rounded border border-amber/35 bg-amber/10 p-3 text-xs leading-relaxed text-muted">
          When an indicator is added, read it in this order: what it measures,
          what it ignores, where it fails, and whether price action agrees with
          it.
        </p>
      )}
    </section>
  );
}

function HistoricalExamples({
  examples,
  pair,
  timeframe,
  candles,
  selectedTime,
  onSelectTime,
  onPreviewExample,
}: {
  examples: HistoricalExample[];
  pair: LearningChartPair;
  timeframe: LearningChartTimeframe;
  candles: Candle[];
  selectedTime: number | null;
  onSelectTime: (time: number) => void;
  onPreviewExample: (example: HistoricalExample) => void;
}) {
  return (
    <section className="rounded border border-border bg-bg p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
            Historical examples
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Practice by comparing older candles before judging the latest one.
          </p>
        </div>
        <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted">
          from loaded history
        </span>
      </div>

      {examples.length === 0 ? (
        <p className="mt-3 rounded border border-border bg-panel p-3 text-sm text-muted">
          Load candles to see examples from the current pair and timeframe.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {examples.map((example) => (
            <article
              key={`${example.title}-${example.time}`}
              className={`rounded border p-3 text-left transition-colors ${
                selectedTime === example.time
                  ? "border-accent bg-accent/15"
                  : "border-border bg-panel hover:border-muted"
              }`}
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                {example.title}
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {format(new Date(example.time * 1000), "MMM d, h:mm a")}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {example.lesson}
              </p>
              <div className="mt-3 font-mono text-[10px] uppercase text-muted">
                Close <span className="text-ink">{formatPrice(example.close)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSelectTime(example.time)}
                  className="rounded border border-border px-2 py-1.5 text-xs text-muted hover:border-muted hover:text-ink"
                >
                  Inspect here
                </button>
                <button
                  type="button"
                  onClick={() => onPreviewExample(example)}
                  className="rounded border border-accent/50 bg-accent/10 px-2 py-1.5 text-xs text-accent hover:border-accent"
                >
                  Mini chart
                </button>
                <a
                  href={buildTradingViewChartUrl({
                    symbol: pair.symbol,
                    timeframe,
                    time: example.time,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-border px-2 py-1.5 text-xs text-muted hover:border-muted hover:text-ink"
                >
                  TradingView
                </a>
              </div>
              <div className="mt-2 text-[10px] leading-relaxed text-muted">
                Mini chart uses {getContextCandleCount(candles, example.time)} loaded
                candles around the example.
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniChartModal({
  example,
  pair,
  timeframe,
  candles,
  onInspectMainChart,
  onClose,
}: {
  example: HistoricalExample;
  pair: LearningChartPair;
  timeframe: LearningChartTimeframe;
  candles: Candle[];
  onInspectMainChart: (time: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const contextCandles = useMemo(
    () => getContextCandles(candles, example.time),
    [candles, example.time]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4">
      <div className="surface-panel w-full max-w-3xl rounded border border-border bg-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
              Historical preview
            </div>
            <h3 className="mt-1 text-lg font-semibold text-ink">
              {example.title} / {pair.symbol} / {timeframe}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {example.lesson}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded border border-border px-3 py-2 text-xs text-muted hover:border-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded border border-border bg-bg">
          <MiniChartCanvas
            candles={contextCandles}
            focusTime={example.time}
            focusClose={example.close}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onInspectMainChart(example.time)}
            className="rounded border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-accent hover:border-accent"
          >
            Inspect on main chart
          </button>
          <a
            href={buildTradingViewChartUrl({
              symbol: pair.symbol,
              timeframe,
              time: example.time,
            })}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-border px-3 py-2 text-xs text-muted hover:border-muted hover:text-ink"
          >
            Open TradingView
          </a>
        </div>
      </div>
    </div>
  );
}

function MiniChartCanvas({
  candles,
  focusTime,
  focusClose,
}: {
  candles: Candle[];
  focusTime: number;
  focusClose: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candles.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 340,
      layout: {
        background: { type: ColorType.Solid, color: "#050807" },
        textColor: "#9BAAA1",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "rgba(23, 77, 54, 0.35)" },
        horzLines: { color: "rgba(23, 77, 54, 0.58)" },
      },
      rightPriceScale: { borderColor: "#174D36", textColor: "#9BAAA1" },
      timeScale: {
        borderColor: "#174D36",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderUpColor: "#22C55E",
      borderDownColor: "#EF4444",
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
      priceLineVisible: false,
    });
    series.setData(
      candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    );
    series.createPriceLine({
      price: focusClose,
      color: "#D6A84F",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "Example close",
    });
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, focusClose, focusTime]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[340px] w-full" />
      <div className="pointer-events-none absolute left-3 top-3 rounded border border-border bg-panel/95 px-3 py-2 font-mono text-[10px] uppercase text-muted">
        Focus {format(new Date(focusTime * 1000), "MMM d, h:mm a")} / C{" "}
        <span className="text-ink">{formatPrice(focusClose)}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-panel p-2">
      <div>{label}</div>
      <div className="mt-1 text-sm text-ink">{value}</div>
    </div>
  );
}

function ReadBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}

type HistoricalExample = {
  title: string;
  time: number;
  close: number;
  lesson: string;
};

type ChartStructureRead = {
  support: number | null;
  resistance: number | null;
  trend: TrendDirection;
  location: StructureLocation;
};

const trendCopy: Record<TrendDirection, string> = {
  up: "Recent closes are mostly climbing. For beginners, bullish ideas still need pullback or breakout proof, not chasing.",
  down: "Recent closes are mostly falling. For beginners, long ideas need extra proof, and short ideas still need clean invalidation.",
  neutral:
    "Recent closes are mixed. For beginners, this usually means wait for price to reach a clearer level.",
};

const locationCopy: Record<StructureLocation, string> = {
  "near-support":
    "Price is close to the lower edge of the recent range. Watch whether sellers fail and buyers defend the area.",
  "near-resistance":
    "Price is close to the upper edge of the recent range. Watch whether buyers break through or get rejected.",
  middle:
    "Price is between the main levels. This is often a lower-quality patience area for beginners.",
  unknown:
    "There is not enough clean candle context yet. Start with the close, then wait for more structure.",
};

function buildStructureRead(
  candles: Candle[],
  selectedCandle: Candle | null
): ChartStructureRead {
  const { support, resistance } = findSupportResistance(candles);
  const trend = detectTrend(candles);
  const location = locatePriceInStructure({
    price: selectedCandle?.close,
    support,
    resistance,
  });

  return { support, resistance, trend, location };
}

function formatStructureLevels(read: ChartStructureRead): string {
  if (read.support === null || read.resistance === null) {
    return "Load more candles before treating support or resistance as meaningful.";
  }

  return `Nearby support is around ${formatPrice(
    read.support
  )}; nearby resistance is around ${formatPrice(
    read.resistance
  )}. Treat them as zones, not exact magic numbers.`;
}

function buildHistoricalExamples(candles: Candle[]): HistoricalExample[] {
  if (candles.length < 10) return [];
  const recent = candles.slice(-120);

  const strongestBody = [...recent].sort((a, b) => bodyScore(b) - bodyScore(a))[0];
  const upperReject = [...recent].sort((a, b) => upperWickScore(b) - upperWickScore(a))[0];
  const lowerReject = [...recent].sort((a, b) => lowerWickScore(b) - lowerWickScore(a))[0];

  return dedupeExamples([
    {
      title: "Strong body",
      time: strongestBody.time,
      close: strongestBody.close,
      lesson:
        "Big bodies show follow-through. Check whether it happened at a level or in open space.",
    },
    {
      title: "Upper rejection",
      time: upperReject.time,
      close: upperReject.close,
      lesson:
        "A larger upper wick means buyers tried higher, then sellers pushed price back.",
    },
    {
      title: "Lower rejection",
      time: lowerReject.time,
      close: lowerReject.close,
      lesson:
        "A larger lower wick means sellers tried lower, then buyers pushed price back.",
    },
  ]);
}

function dedupeExamples(examples: HistoricalExample[]): HistoricalExample[] {
  const seen = new Set<number>();
  return examples.filter((example) => {
    if (seen.has(example.time)) return false;
    seen.add(example.time);
    return true;
  });
}

function getContextCandles(candles: Candle[], time: number): Candle[] {
  const index = candles.findIndex((candle) => candle.time === time);
  if (index < 0) return candles.slice(-34);
  const start = Math.max(0, index - 16);
  const end = Math.min(candles.length, index + 17);
  return candles.slice(start, end);
}

function getContextCandleCount(candles: Candle[], time: number): number {
  return getContextCandles(candles, time).length;
}

function bodyScore(candle: Candle): number {
  const range = Math.max(candle.high - candle.low, Number.EPSILON);
  return Math.abs(candle.close - candle.open) / range;
}

function upperWickScore(candle: Candle): number {
  const range = Math.max(candle.high - candle.low, Number.EPSILON);
  return (candle.high - Math.max(candle.open, candle.close)) / range;
}

function lowerWickScore(candle: Candle): number {
  const range = Math.max(candle.high - candle.low, Number.EPSILON);
  return (Math.min(candle.open, candle.close) - candle.low) / range;
}

function formatSigned(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function toLineData(
  points: TechnicalIndicatorSeries["ema20"]
): LineData<UTCTimestamp>[] {
  return points.map((point) => ({
    time: point.time as UTCTimestamp,
    value: point.value,
  }));
}

function formatOptionalPrice(value: number | null): string {
  return value === null ? "--" : formatPrice(value);
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? "--" : value.toFixed(1);
}

function buildLearningChartContextNote({
  pair,
  timeframe,
  selectedCandle,
  structure,
  indicators,
  practiceDirection,
  levels,
  riskReward,
}: {
  pair: LearningChartPair;
  timeframe: LearningChartTimeframe;
  selectedCandle: Candle | null;
  structure: ChartStructureRead;
  indicators: TechnicalIndicatorRead;
  practiceDirection: PracticeDirection;
  levels: PracticeLevels;
  riskReward: RiskRewardReadout;
}): string {
  const selectedTime = selectedCandle
    ? format(new Date(selectedCandle.time * 1000), "MMM d, yyyy h:mm a")
    : "latest loaded candle";
  const close = selectedCandle ? formatPrice(selectedCandle.close) : "unknown";
  const support =
    structure.support === null ? "unknown" : formatPrice(structure.support);
  const resistance =
    structure.resistance === null ? "unknown" : formatPrice(structure.resistance);

  return [
    `${pair.symbol} on the ${timeframe} chart at ${selectedTime}.`,
    `Current selected close is ${close}. Recent structure: ${trendCopy[structure.trend]} Location: ${locationCopy[structure.location]}`,
    `Support zone is around ${support}; resistance zone is around ${resistance}.`,
    `Selected practice direction is ${practiceDirection}.`,
    `Indicators: ${indicators.summary}`,
    `EMA20 ${formatOptionalPrice(indicators.ema20)}, EMA50 ${formatOptionalPrice(
      indicators.ema50
    )}, RSI14 ${formatOptionalNumber(indicators.rsi14)}, ATR14 ${formatOptionalPrice(
      indicators.atr14
    )}, relative volume ${formatOptionalNumber(indicators.relativeVolume20)}x.`,
    `Practice levels: entry ${formatOptionalPrice(
      levels.entry
    )}, stop ${formatOptionalPrice(levels.stop)}, target ${formatOptionalPrice(
      levels.target
    )}. Estimated R/R: ${riskReward.label}.`,
    "This is a paper-planning read only. The plan should explain what would prove the idea wrong before thinking about reward.",
  ].join(" ");
}

function getInitialPairFromUrl(fallback?: string): string {
  if (typeof window === "undefined") {
    return findLearningChartPair(fallback)?.symbol ?? DEFAULT_LEARNING_PAIR.symbol;
  }
  const requested = new URLSearchParams(window.location.search).get("pair");
  return (
    findLearningChartPair(requested)?.symbol ??
    findLearningChartPair(fallback)?.symbol ??
    DEFAULT_LEARNING_PAIR.symbol
  );
}

function getInitialTimeframeFromUrl(fallback?: string): LearningChartTimeframe {
  if (typeof window === "undefined") {
    return fallback
      ? normalizeLearningChartTimeframe(fallback)
      : DEFAULT_LEARNING_TIMEFRAME;
  }
  return normalizeLearningChartTimeframe(
    new URLSearchParams(window.location.search).get("timeframe") ?? fallback
  );
}
