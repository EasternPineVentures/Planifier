import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { pickModel } from "@/lib/ai/router";
import { getKrakenMarketSnapshot, type MarketSnapshot } from "@/lib/market/kraken";
import { readFoxClawContext, type FoxClawContext } from "@/lib/context/foxclaw";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  pair: z.string().min(2).max(20),
  timeframe: z.string().optional(),
  riskPercent: z.string().optional(),
  style: z.enum(["Scalp", "Day", "Swing", "Position", "Unsure"]).optional(),
  useFoxClaw: z.boolean().optional(),
});

const SetupCandidateSchema = z.object({
  label: z.string(),
  bias: z.enum(["long", "short", "neutral"]),
  thesis: z.string(),
  whatToWaitFor: z.array(z.string()).min(2).max(5),
  invalidation: z.array(z.string()).min(1).max(4),
  riskNotes: z.array(z.string()).min(1).max(4),
  chartContext: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  planSeed: z.object({
    ticker: z.string(),
    timeframe: z.string(),
    holdingPeriod: z.enum(["Scalp", "Day", "Swing", "Position"]),
    riskPercent: z.string(),
    chartNote: z.string(),
  }),
});

const ExploreResultSchema = z.object({
  overview: z.string(),
  dataNotes: z.array(z.string()).min(1).max(5),
  candidates: z.array(SetupCandidateSchema).min(2).max(3),
});

type ExploreResult = z.infer<typeof ExploreResultSchema>;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: "Pick a pair first." }, { status: 400 });
  }

  const {
    pair,
    timeframe = "4H",
    riskPercent = "1%",
    style = "Unsure",
    useFoxClaw = true,
  } = parsed.data;

  let marketSnapshot: MarketSnapshot | null = null;
  let marketError: string | null = null;
  try {
    marketSnapshot = await getKrakenMarketSnapshot({ pair, timeframe });
  } catch (err) {
    marketError = err instanceof Error ? err.message : "Market snapshot unavailable";
  }

  const foxClaw = useFoxClaw ? readFoxClawContext(pair) : null;
  const { model } = pickModel({ task: "plan" });

  let result: ExploreResult;
  try {
    const generated = await generateObject({
      model,
      schema: ExploreResultSchema,
      system:
        "You generate educational paper-trading setup candidates for Planifier. " +
        "Your job is to give a beginner somewhere to start, not to tell them what to buy or sell. " +
        "Use the market snapshot and optional FoxClaw context only as evidence. " +
        "If evidence is thin or unavailable, say so and provide neutral observation plans. " +
        "Every candidate must include a wait-for condition and invalidation. " +
        "Never use phrases like guaranteed, obvious trade, must buy, must short, or sure thing. " +
        "If FoxClaw context is present, treat it as context_only/advisory and do not inherit trade authority.",
      messages: [
        {
          role: "user",
          content:
            `Pair: ${pair}\n` +
            `Preferred timeframe: ${timeframe}\n` +
            `Risk per trade: ${riskPercent}\n` +
            `Preferred style: ${style}\n\n` +
            `Market snapshot:\n${JSON.stringify(marketSnapshot, null, 2)}\n` +
            `Market error, if any: ${marketError ?? "none"}\n\n` +
            `FoxClaw context:\n${JSON.stringify(foxClaw, null, 2)}`,
        },
      ],
      temperature: 0.2,
    });
    result = generated.object;
  } catch (err) {
    console.error("[planifier] explore generation failed", err);
    result = fallbackExplore({
      pair,
      timeframe,
      riskPercent,
      style,
      marketSnapshot,
      marketError,
      foxClaw,
    });
  }

  return Response.json({
    ...result,
    marketSnapshot,
    marketError,
    foxClaw,
  });
}

function fallbackExplore({
  pair,
  timeframe,
  riskPercent,
  style,
  marketSnapshot,
  marketError,
  foxClaw,
}: {
  pair: string;
  timeframe: string;
  riskPercent: string;
  style: z.infer<typeof BodySchema>["style"];
  marketSnapshot: MarketSnapshot | null;
  marketError: string | null;
  foxClaw: FoxClawContext | null;
}): ExploreResult {
  const holdingPeriod =
    style === "Scalp" || style === "Day" || style === "Swing" || style === "Position"
      ? style
      : "Swing";
  const snapshotLine = marketSnapshot
    ? `${pair} ${timeframe} is in a ${marketSnapshot.trendLabel} and currently ${marketSnapshot.rangePosition} inside the recent range near ${marketSnapshot.lastClose}.`
    : `${pair} ${timeframe} market data was not available, so this is an observation-only starting point.`;
  const sourceNote = foxClaw?.available
    ? "FoxClaw context was available as read-only advisory context."
    : "FoxClaw context was not available in this runtime.";

  return {
    overview:
      `${snapshotLine} Treat these as paper-trade planning angles, not signals.`,
    dataNotes: [
      marketSnapshot
        ? "Kraken public OHLC data was used for a lightweight chart snapshot."
        : `Market snapshot unavailable: ${marketError ?? "unknown reason"}.`,
      sourceNote,
      "Each candidate requires confirmation before becoming a structured plan.",
    ],
    candidates: [
      {
        label: "Continuation after confirmation",
        bias: marketSnapshot?.trendLabel === "downtrend" ? "short" : "long",
        thesis:
          "If the current trend remains intact, the cleanest lesson is waiting for confirmation instead of chasing the first move.",
        whatToWaitFor: [
          "A candle close that confirms direction near a clear level.",
          "A retest that holds instead of instantly reversing.",
          "Volume or momentum that supports the continuation read.",
        ],
        invalidation: [
          "Price closes back through the level that was supposed to hold.",
          "The recent swing structure breaks against the idea.",
        ],
        riskNotes: [
          `Keep risk near ${riskPercent}.`,
          "Skip the plan if invalidation is too far away for the stated risk.",
        ],
        chartContext:
          `${snapshotLine} The continuation angle needs a confirmed hold or retest before it becomes actionable as a paper plan.`,
        confidence: marketSnapshot ? "medium" : "low",
        planSeed: {
          ticker: pair.toUpperCase(),
          timeframe,
          holdingPeriod,
          riskPercent,
          chartNote:
            `${snapshotLine} I am looking for a continuation plan only if price confirms the level and does not chase. ` +
            "Invalidation is a close back through the level that should hold or a break in the recent swing structure.",
        },
      },
      {
        label: "Failed move or reversal watch",
        bias: "neutral",
        thesis:
          "If the market rejects the obvious level, the better lesson may be patience around a failed move instead of forcing continuation.",
        whatToWaitFor: [
          "A failed breakout or failed breakdown at a clear level.",
          "A reclaim or rejection candle that shows trapped traders.",
          "A clear invalidation level close enough for the risk limit.",
        ],
        invalidation: [
          "Price accepts beyond the failed-move level and does not return.",
          "The reversal trigger appears before a clean level is defined.",
        ],
        riskNotes: [
          `Keep risk near ${riskPercent}.`,
          "This is lower confidence until the failed move is visible.",
        ],
        chartContext:
          `${snapshotLine} The reversal angle is only a watchlist idea unless price clearly fails at a level and gives a defined invalidation.`,
        confidence: "low",
        planSeed: {
          ticker: pair.toUpperCase(),
          timeframe,
          holdingPeriod,
          riskPercent,
          chartNote:
            `${snapshotLine} I am watching for a failed move at a clear level. ` +
            "The plan should explain what confirmation is needed, why this may just be a trap, and where the idea is invalidated.",
        },
      },
    ],
  };
}
