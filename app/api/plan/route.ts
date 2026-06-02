import { generateObject } from "ai";
import { z } from "zod";
import { pickModel } from "@/lib/ai/router";
import { getRuntimeSystemPrompt } from "@/lib/prompts";
import {
  validateInputs,
  inferTimeframeMismatch,
  type PlanInputs,
} from "@/lib/validation";
import { PlanSchema } from "@/lib/plan/schema";
import type { Plan } from "@/lib/plan/schema";
import { FIXED_RISK_NUMERIC, FIXED_RISK_PERCENT } from "@/lib/plan/risk";
import { planError } from "@/lib/plan/errors";
import { buildFallbackPlan } from "@/lib/plan/fallbackPlan";
import { requireUserId } from "@/lib/db/users";
import { db, schema } from "@/lib/db/client";
import { buildSourceLinks } from "@/lib/sources/sourceLinks";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  inputs: z.object({
    ticker: z.string(),
    timeframe: z.string(),
    holdingPeriod: z.enum(["Scalp", "Day", "Swing", "Position"]),
    riskPercent: z.string().optional(),
    chartNote: z.string().optional(),
  }),
  imageDataUrl: z.string().nullable().optional(),
  userQuestion: z.string().optional(),
  learningMode: z.enum(["standard", "beginner"]).optional().default("standard"),
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
  const { inputs, imageDataUrl, userQuestion, learningMode } = parsed.data;
  const fixedInputs = { ...inputs, riskPercent: FIXED_RISK_PERCENT };

  const planInputs: PlanInputs = { ...fixedInputs, hasImage: !!imageDataUrl };
  const missing = validateInputs(planInputs);
  if (missing.length > 0) {
    return Response.json(planError("MISSING_INPUT", { missing }), { status: 422 });
  }

  const mismatch = inferTimeframeMismatch(
    fixedInputs.timeframe,
    fixedInputs.holdingPeriod
  );

  const systemPrompt =
    getRuntimeSystemPrompt() +
    `\n\n--- OUTPUT MODE ---\n` +
    `Return a STRUCTURED plan matching the provided JSON schema. ` +
    `Do not omit the disclaimer field. ` +
    `If the chart info is insufficient to set a numeric invalidation price, set invalidation.price to null and explain in the condition. ` +
    (learningMode === "beginner"
      ? `The user selected Still Learning mode. Include beginnerGuide and explain terms in simple, concrete language.`
      : `The user selected Standard mode. Keep the core plan concise; beginnerGuide may be omitted.`);

  const contextLines = [
    `Ticker: ${fixedInputs.ticker}`,
    `Timeframe: ${fixedInputs.timeframe}`,
    `Holding period: ${fixedInputs.holdingPeriod}`,
    `Risk per trade: ${FIXED_RISK_PERCENT} (fixed by Planifier; user cannot change this)`,
    fixedInputs.chartNote ? `Chart note: ${fixedInputs.chartNote}` : null,
    mismatch ? `Timeframe mismatch (must flag): ${mismatch}` : null,
    userQuestion ? `User question: ${userQuestion}` : null,
    `Learning mode: ${learningMode === "beginner" ? "Still Learning" : "Standard"}`,
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

  const { model } = pickModel({ task: "plan", needsVision: !!imageDataUrl });

  let plan: Plan;
  const sourceLinks = buildSourceLinks({
    assetTicker: fixedInputs.ticker,
  });

  try {
    const result = await generateObject({
      model,
      schema: PlanSchema,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.3,
    });
    plan = ensureBeginnerGuide(
      {
        ...result.object,
        // App-generated deterministic links; never model-invented.
        trustedSourceLinks: sourceLinks,
      },
      {
        inputs: fixedInputs,
        learningMode,
      }
    );
  } catch (err) {
    console.error("[planifier] generateObject failed", err);
    plan = buildFallbackPlan({
      inputs: fixedInputs,
      learningMode,
      timeframeMismatchWarning: mismatch,
      trustedSourceLinks: sourceLinks,
    });
  }

  // Persist
  try {
    const [row] = await db
      .insert(schema.plans)
      .values({
        userId,
        ticker: fixedInputs.ticker,
        timeframe: fixedInputs.timeframe,
        holdingPeriod: fixedInputs.holdingPeriod,
        riskPercent: FIXED_RISK_NUMERIC,
        chartNote: fixedInputs.chartNote ?? null,
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

function ensureBeginnerGuide(
  plan: Plan,
  {
    inputs,
    learningMode,
  }: {
    inputs: {
      ticker: string;
      timeframe: string;
      holdingPeriod: "Scalp" | "Day" | "Swing" | "Position";
      riskPercent?: string;
      chartNote?: string;
    };
    learningMode: "standard" | "beginner";
  }
): Plan {
  if (learningMode !== "beginner" || plan.beginnerGuide) return plan;

  return {
    ...plan,
    beginnerGuide: {
      simpleSummary:
        `This is a practice plan for ${inputs.ticker} on the ${inputs.timeframe} chart. ` +
        "It is not telling you what to do. It is helping you decide what must happen before the idea is strong enough to practice.",
      keyTerms: [
        {
          term: "Timeframe",
          meaning: "The amount of time each chart candle represents.",
          inThisPlan: `${inputs.timeframe} means each candle summarizes about ${inputs.timeframe} of price movement.`,
        },
        {
          term: "Confirmation",
          meaning: "A clue you wait for before trusting the idea more.",
          inThisPlan: plan.examplePlan.entryTrigger,
        },
        {
          term: "Invalidation",
          meaning: "The line where the idea is wrong and you stop pretending it is still working.",
          inThisPlan: plan.invalidation.condition,
        },
        {
          term: "Risk",
          meaning: "The small paper-trading amount you allow the practice idea to lose before stepping away.",
          inThisPlan: `Planifier keeps this fixed at ${FIXED_RISK_PERCENT} so beginners practice with the same guardrail every time.`,
        },
      ],
      stepByStep: [
        "First, read the chart idea in plain English.",
        "Next, check what must confirm the idea.",
        "Then, check what would make the idea wrong.",
        "Only paper trade the plan if the checklist rules are still true.",
      ],
      riskTranslation:
        `Risk is locked at ${FIXED_RISK_PERCENT}. In simple words: this plan practices losing small and stopping when the idea is wrong.`,
    },
  };
}
