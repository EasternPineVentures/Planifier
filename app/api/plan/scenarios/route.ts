import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getKrakenHistoricalCandles } from "@/lib/market/kraken";
import {
  buildHistoricalScenarioMap,
  normalizeHistoricalCandles,
  type HoldingPeriod,
} from "@/lib/plan/historicalScenarios";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  pair: z.string().min(2).max(20),
  timeframe: z.string().optional().default("4H"),
  holdingPeriod: z.enum(["Scalp", "Day", "Swing", "Position"]).optional().default("Swing"),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: "Pick a pair, timeframe, and style first." }, { status: 400 });
  }

  const { pair, timeframe, holdingPeriod } = parsed.data;

  try {
    const historical = await getKrakenHistoricalCandles({
      pair,
      timeframe,
      limit: 360,
    });
    const candles = normalizeHistoricalCandles({
      candles: historical.candles,
      source: historical.source,
      intervalMinutes: historical.intervalMinutes,
    });
    const scenario = buildHistoricalScenarioMap({
      pair: pair.trim().toUpperCase(),
      timeframe,
      holdingPeriod: holdingPeriod as HoldingPeriod,
      candles,
    });

    return Response.json({ scenario });
  } catch (err) {
    console.error("[planifier] historical scenario failed", err);
    return Response.json(
      {
        message:
          "Historical scenario mapping is not available for that pair/timeframe yet. Use the practice examples for now.",
      },
      { status: 502 }
    );
  }
}
