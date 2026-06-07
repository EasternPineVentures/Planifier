import { NextResponse } from "next/server";
import { z } from "zod";
import { getKrakenMarketSnapshot } from "@/lib/market/kraken";
import {
  buildLearningMarketOverviewPayload,
  LEARNING_CHART_PAIRS,
  normalizeLearningChartTimeframe,
  type LearningMarketOverviewItem,
} from "@/lib/market/learningChart";

const querySchema = z.object({
  timeframe: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid market overview request.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const timeframe = normalizeLearningChartTimeframe(parsed.data.timeframe);
  const settled = await Promise.allSettled(
    LEARNING_CHART_PAIRS.map(async (pair): Promise<LearningMarketOverviewItem> => {
      const snapshot = await getKrakenMarketSnapshot({
        pair: pair.symbol,
        timeframe,
      });

      return {
        symbol: pair.symbol,
        label: pair.label,
        lastClose: snapshot.lastClose,
        changePercent: snapshot.changePercent,
        support: snapshot.support,
        resistance: snapshot.resistance,
        trendLabel: snapshot.trendLabel,
        rangePosition: snapshot.rangePosition,
        candleCount: snapshot.candleCount,
      };
    })
  );

  const items = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  if (items.length === 0) {
    return NextResponse.json(
      {
        error: "Could not load public market overview from Kraken.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    buildLearningMarketOverviewPayload({
      timeframe,
      items,
    }),
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
