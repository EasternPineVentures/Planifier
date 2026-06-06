import { NextResponse } from "next/server";
import { z } from "zod";
import { getKrakenHistoricalCandles } from "@/lib/market/kraken";
import {
  buildLearningOhlcPayload,
  findLearningChartPair,
  LEARNING_CHART_PAIRS,
  normalizeLearningChartTimeframe,
} from "@/lib/market/learningChart";

const querySchema = z.object({
  pair: z.string().optional(),
  timeframe: z.string().optional(),
  limit: z.coerce.number().int().min(40).max(500).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid OHLC request.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const pair = findLearningChartPair(parsed.data.pair);
  if (!pair) {
    return NextResponse.json(
      {
        error: "Unsupported learning chart pair.",
        supportedPairs: LEARNING_CHART_PAIRS.map((item) => item.symbol),
      },
      { status: 400 }
    );
  }

  const timeframe = normalizeLearningChartTimeframe(parsed.data.timeframe);

  try {
    const historical = await getKrakenHistoricalCandles({
      pair: pair.symbol,
      timeframe,
      limit: parsed.data.limit ?? 240,
    });

    return NextResponse.json(
      buildLearningOhlcPayload({
        historical,
        timeframe,
      }),
      {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Kraken OHLC error";
    return NextResponse.json(
      {
        error: "Could not load public market candles from Kraken.",
        message,
      },
      { status: 502 }
    );
  }
}
