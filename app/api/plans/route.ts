import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

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
