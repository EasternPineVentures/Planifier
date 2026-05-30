import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { and, eq, asc } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await ctx.params;

  const [plan] = await db
    .select()
    .from(schema.plans)
    .where(and(eq(schema.plans.id, id), eq(schema.plans.userId, userId)))
    .limit(1);
  if (!plan) return new Response("Not found", { status: 404 });

  const journal = await db
    .select()
    .from(schema.journalEntries)
    .where(eq(schema.journalEntries.planId, id))
    .orderBy(asc(schema.journalEntries.createdAt));

  return Response.json({ plan, journal });
}

const JournalSchema = z.object({
  outcome: z.enum(["win", "loss", "scratch", "skipped"]).optional(),
  followedChecklist: z.enum(["yes", "partial", "no"]).optional(),
  hitInvalidation: z.enum(["yes", "no", "na"]).optional(),
  notes: z.string().max(4000).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await ctx.params;

  // Verify plan ownership
  const [plan] = await db
    .select({ id: schema.plans.id })
    .from(schema.plans)
    .where(and(eq(schema.plans.id, id), eq(schema.plans.userId, userId)))
    .limit(1);
  if (!plan) return new Response("Not found", { status: 404 });

  const parsed = JournalSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.journalEntries)
    .values({
      planId: id,
      userId,
      outcome: parsed.data.outcome ?? null,
      followedChecklist: parsed.data.followedChecklist ?? null,
      hitInvalidation: parsed.data.hitInvalidation ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return Response.json({ entry: row });
}
