import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { buildChartSavedPlan } from "@/lib/plan/chartSavedPlan";
import { FIXED_RISK_NUMERIC } from "@/lib/plan/risk";
import {
  LEARNING_CHART_TIMEFRAMES,
  findLearningChartPair,
} from "@/lib/market/learningChart";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

const ChartPlanBodySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .refine((value) => !!findLearningChartPair(value), {
      message: "Unsupported learning chart pair",
    }),
  timeframe: z.enum(LEARNING_CHART_TIMEFRAMES),
  entry: z.number().finite(),
  stop: z.number().finite(),
  target: z.number().finite(),
  riskReward: z.number().finite().nullable().optional(),
  notes: z.string().max(1200).nullable().optional(),
  currentPrice: z.number().finite().nullable().optional(),
  selectedCandleTime: z.string().max(80).nullable().optional(),
});

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const rows = await db
    .select({
      id: schema.plans.id,
      ticker: schema.plans.ticker,
      timeframe: schema.plans.timeframe,
      holdingPeriod: schema.plans.holdingPeriod,
      riskPercent: schema.plans.riskPercent,
      createdAt: schema.plans.createdAt,
    })
    .from(schema.plans)
    .where(eq(schema.plans.userId, userId))
    .orderBy(desc(schema.plans.createdAt))
    .limit(100);

  return Response.json({ plans: rows });
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ChartPlanBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid chart plan", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { plan, chartNote, holdingPeriod } = buildChartSavedPlan({
    ...parsed.data,
    riskReward: parsed.data.riskReward ?? null,
  });

  try {
    const [row] = await db
      .insert(schema.plans)
      .values({
        userId,
        ticker: parsed.data.symbol.toUpperCase(),
        timeframe: parsed.data.timeframe,
        holdingPeriod,
        riskPercent: FIXED_RISK_NUMERIC,
        chartNote,
        plan,
      })
      .returning({ id: schema.plans.id });

    return Response.json({ id: row.id, plan }, { status: 201 });
  } catch (error) {
    console.error("[planifier] chart plan insert failed", error);
    return Response.json(
      { error: "Plan could not be saved right now." },
      { status: 503 }
    );
  }
}
