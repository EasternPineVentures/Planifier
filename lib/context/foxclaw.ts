import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type FoxClawContext = {
  available: boolean;
  authority: "context_only";
  sourcePath?: string;
  generatedAt?: string;
  posture?: string;
  liveAuthorityLocked?: boolean;
  canSubmitOrders?: boolean;
  relayStatus?: string;
  sourceTrust?: Array<{
    sourceId: string;
    sourceType: string;
    trustScore: number;
    authorityLevel: string;
  }>;
  paperMetrics?: {
    openPositionCount?: number;
    closedTradeCount?: number;
    winRate?: number;
    profitFactor?: number;
    totalRealizedPnlUsd?: number;
  };
  matchingOpenPositions?: Array<{
    symbol: string;
    side: string;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnlUsd: number;
    lastUpdated: string;
  }>;
  note: string;
};

type CommandCenter = {
  generated_at?: string;
  posture?: string;
  live_authority?: {
    live_trading_authority?: string;
    can_submit_orders?: boolean;
  };
  redshift_relay?: {
    relay_status?: string;
    can_submit_orders?: boolean;
  };
  source_trust?: {
    sources?: Array<{
      source_id?: string;
      source_type?: string;
      trust_score?: number;
      authority_level?: string;
    }>;
  };
  paper_outcome_metrics?: {
    open_position_count?: number;
    closed_trade_count?: number;
    win_rate?: number;
    profit_factor?: number;
    total_realized_pnl_usd?: number;
    open_positions?: Array<{
      symbol?: string;
      side?: string;
      entry_price?: number;
      current_price?: number;
      unrealized_pnl_usd?: number;
      last_updated?: string;
    }>;
  };
};

export function readFoxClawContext(pair?: string): FoxClawContext {
  const sourcePath = resolve(foxClawRoot(), "runtime_logs", "command_center.json");
  if (!existsSync(sourcePath)) {
    return {
      available: false,
      authority: "context_only",
      note:
        "FoxClaw context is not available in this runtime. Planifier can still generate educational starting angles from user input and public market data.",
    };
  }

  try {
    const data = JSON.parse(readFileSync(sourcePath, "utf8")) as CommandCenter;
    const normalizedPair = pair ? normalizeSymbol(pair) : null;
    const positions =
      data.paper_outcome_metrics?.open_positions
        ?.filter((position) =>
          normalizedPair ? normalizeSymbol(position.symbol ?? "") === normalizedPair : true
        )
        .slice(0, 5)
        .map((position) => ({
          symbol: position.symbol ?? "",
          side: position.side ?? "",
          entryPrice: Number(position.entry_price ?? 0),
          currentPrice: Number(position.current_price ?? 0),
          unrealizedPnlUsd: Number(position.unrealized_pnl_usd ?? 0),
          lastUpdated: position.last_updated ?? "",
        })) ?? [];

    return {
      available: true,
      authority: "context_only",
      sourcePath,
      generatedAt: data.generated_at,
      posture: data.posture,
      liveAuthorityLocked:
        data.live_authority?.live_trading_authority === "locked" ||
        data.live_authority?.can_submit_orders === false,
      canSubmitOrders:
        data.live_authority?.can_submit_orders === true ||
        data.redshift_relay?.can_submit_orders === true,
      relayStatus: data.redshift_relay?.relay_status,
      sourceTrust:
        data.source_trust?.sources?.slice(0, 5).map((source) => ({
          sourceId: source.source_id ?? "",
          sourceType: source.source_type ?? "",
          trustScore: Number(source.trust_score ?? 0),
          authorityLevel: source.authority_level ?? "advisory_only",
        })) ?? [],
      paperMetrics: {
        openPositionCount: data.paper_outcome_metrics?.open_position_count,
        closedTradeCount: data.paper_outcome_metrics?.closed_trade_count,
        winRate: data.paper_outcome_metrics?.win_rate,
        profitFactor: data.paper_outcome_metrics?.profit_factor,
        totalRealizedPnlUsd: data.paper_outcome_metrics?.total_realized_pnl_usd,
      },
      matchingOpenPositions: positions,
      note:
        "FoxClaw context is read-only and advisory. It can inform Planifier examples, but it cannot approve trades or carry live authority.",
    };
  } catch (err) {
    console.error("[planifier] failed to read FoxClaw context", err);
    return {
      available: false,
      authority: "context_only",
      sourcePath,
      note: "FoxClaw context file exists but could not be parsed.",
    };
  }
}

function foxClawRoot(): string {
  if (process.env.FOXCLAW_CONTEXT_ROOT) return process.env.FOXCLAW_CONTEXT_ROOT;
  return join(process.cwd(), "..", "FoxClaw");
}

function normalizeSymbol(symbol: string): string {
  return symbol.replace(/[^a-z0-9]/gi, "").toUpperCase().replace(/^XBT/, "BTC");
}
