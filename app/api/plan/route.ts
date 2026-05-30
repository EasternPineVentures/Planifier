import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { getRuntimeSystemPrompt } from "@/lib/prompts";
import {
  validateInputs,
  inferTimeframeMismatch,
  type PlanInputs,
} from "@/lib/validation";
import { PlanSchema } from "@/lib/plan/schema";
import { planError } from "@/lib/plan/errors";
import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  inputs: z.object({
    ticker: z.string(),
    timeframe: z.string(),
    holdingPeriod: z.enum(["Scalp", "Day", "Swing", "Position"]),
    riskPercent: z.string(),
    chartNote: z.string().optional(),
  }),
  imageDataUrl: z.string().nullable().optional(),
  userQuestion: z.string().optional(),
});

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return Response.json(planError("UNAUTHORIZED"), { status: 401 });
  }

  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return Response.json(planError("MISSING_INPUT"), { status: 400 });
  }
  if (!parsed.success) {
    return Response.json(planError("MISSING_INPUT"), { status: 400 });
  }
  const { inputs, imageDataUrl, userQuestion } = parsed.data;

  const planInputs: PlanInputs = { ...inputs, hasImage: !!imageDataUrl };
  const missing = validateInputs(planInputs);
  if (missing.length > 0) {
    return Response.json(planError("MISSING_INPUT", { missing }), { status: 422 });
  }

  const mismatch = inferTimeframeMismatch(inputs.timeframe, inputs.holdingPeriod);

  const systemPrompt =
    getRuntimeSystemPrompt() +
    `\n\n--- OUTPUT MODE ---\n` +
    `Return a STRUCTURED plan matching the provided JSON schema. ` +
    `Do not omit the disclaimer field. ` +
    `If the chart info is insufficient to set a numeric invalidation price, set invalidation.price to null and explain in the condition.`;

  const contextLines = [
    `Ticker: ${inputs.ticker}`,
    `Timeframe: ${inputs.timeframe}`,
    `Holding period: ${inputs.holdingPeriod}`,
    `Risk per trade: ${inputs.riskPercent}`,
    inputs.chartNote ? `Chart note: ${inputs.chartNote}` : null,
    mismatch ? `Timeframe mismatch (must flag): ${mismatch}` : null,
    userQuestion ? `User question: ${userQuestion}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userContent: Array<
    { type: "text"; text: string } | { type: "image"; image: string }
  > = [
    {
      type: "text",
      text:
        `Build a structured trading PLAN (not a signal) for the following.\n\n` +
        contextLines,
    },
  ];
  if (imageDataUrl) userContent.push({ type: "image", image: imageDataUrl });

  const model = openai(process.env.PLANIFIER_MODEL || "gpt-4o");

  let plan;
  try {
    const result = await generateObject({
      model,
      schema: PlanSchema,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.3,
    });
    plan = result.object;
  } catch (err) {
    console.error("[planifier] generateObject failed", err);
    return Response.json(planError("AI_SCHEMA_FAILURE"), { status: 502 });
  }

  // Persist
  try {
    const [row] = await db
      .insert(schema.plans)
      .values({
        userId,
        ticker: inputs.ticker,
        timeframe: inputs.timeframe,
        holdingPeriod: inputs.holdingPeriod,
        riskPercent: inputs.riskPercent.replace("%", "").trim(),
        chartNote: inputs.chartNote ?? null,
        plan,
      })
      .returning({ id: schema.plans.id });

    return Response.json({ id: row.id, plan });
  } catch (err) {
    console.error("[planifier] plan insert failed", err);
    // Plan is good; return it so the user still gets value, but signal save failure.
    return Response.json(
      { ...planError("DATABASE_FAILURE"), plan },
      { status: 503 }
    );
  }
}
