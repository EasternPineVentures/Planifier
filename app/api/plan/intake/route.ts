import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { pickModel } from "@/lib/ai/router";
import {
  inferTimeframeMismatch,
  validateInputs,
  type PlanInputs,
} from "@/lib/validation";
import { FIXED_RISK_PERCENT, isFixedRiskPercent } from "@/lib/plan/risk";

export const runtime = "nodejs";
export const maxDuration = 60;

const PartialInputsSchema = z.object({
  ticker: z.string().optional(),
  timeframe: z.string().optional(),
  holdingPeriod: z.enum(["Scalp", "Day", "Swing", "Position", ""]).optional(),
  riskPercent: z.string().optional(),
  chartNote: z.string().optional(),
});

const BodySchema = z.object({
  message: z.string().min(1).max(6000),
  inputs: PartialInputsSchema.optional(),
  imageDataUrl: z.string().nullable().optional(),
});

const IntakeResultSchema = z.object({
  inputs: z.object({
    ticker: z.string().nullable(),
    timeframe: z.string().nullable(),
    holdingPeriod: z.enum(["Scalp", "Day", "Swing", "Position"]).nullable(),
    riskPercent: z.string().nullable(),
    chartNote: z.string().nullable(),
  }),
  userQuestion: z.string().nullable(),
  assistantMessage: z.string(),
  extractedFields: z.array(
    z.enum(["ticker", "timeframe", "holdingPeriod", "riskPercent", "chartNote"])
  ),
  confidence: z.enum(["low", "medium", "high"]),
});

type IntakeResult = z.infer<typeof IntakeResultSchema>;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: "Send a plain-English setup first." }, { status: 400 });
  }

  const { message, inputs = {}, imageDataUrl } = parsed.data;
  const currentInputs: PlanInputs = cleanInputs(inputs);
  const { model } = pickModel({ task: "plan", needsVision: !!imageDataUrl });

  let intake: IntakeResult;
  try {
    const result = await generateObject({
      model,
      schema: IntakeResultSchema,
      system:
        "You are Planifier's intake assistant for educational paper-trading plans. " +
        "Extract structured planning inputs from plain English. Do not invent missing facts. " +
        "Keep existing inputs unless the latest message clearly replaces them. " +
        `Normalize symbols to uppercase and normalize common timeframes like 4h to 4H. Risk is fixed at ${FIXED_RISK_PERCENT}; do not extract or change user risk. ` +
        `Always return riskPercent as ${FIXED_RISK_PERCENT}. If the user mentions a different risk, briefly say Planifier keeps risk fixed at ${FIXED_RISK_PERCENT}. ` +
        "Only use holdingPeriod values Scalp, Day, Swing, or Position. Infer holding period only from clear language such as scalp, intraday, day trade, swing, or position. " +
        "Build chartNote from the user's actual chart context: trend, levels, current price behavior, uncertainty, and invalidation. " +
        "If chart context is too vague, leave chartNote null and ask for concrete levels or structure. " +
        "Never give a buy/sell signal, prediction, or financial advice. The assistantMessage must be brief and useful.",
      messages: [
        {
          role: "user",
          content: buildUserContent({
            message,
            currentInputs,
            imageDataUrl,
          }),
        },
      ],
      temperature: 0.1,
    });
    intake = result.object;
  } catch (err) {
    console.error("[planifier] intake extraction failed", err);
    intake = heuristicIntake(message, currentInputs);
  }

  const attemptedRisk = matchRisk(message);
  const mergedInputs = mergeInputs(currentInputs, intake.inputs);
  const assistantMessage =
    attemptedRisk && !isFixedRiskPercent(attemptedRisk)
      ? withFixedRiskNotice(intake.assistantMessage)
      : intake.assistantMessage;
  const planInputs: PlanInputs = { ...mergedInputs, hasImage: !!imageDataUrl };
  const missing = validateInputs(planInputs);
  const mismatch =
    mergedInputs.timeframe && mergedInputs.holdingPeriod
      ? inferTimeframeMismatch(mergedInputs.timeframe, mergedInputs.holdingPeriod)
      : null;

  return Response.json({
    ...intake,
    assistantMessage,
    inputs: mergedInputs,
    missing,
    mismatch,
  });
}

function buildUserContent({
  message,
  currentInputs,
  imageDataUrl,
}: {
  message: string;
  currentInputs: PlanInputs;
  imageDataUrl?: string | null;
}): Array<{ type: "text"; text: string } | { type: "image"; image: string }> {
  const context = [
    currentInputs.ticker ? `Current ticker: ${currentInputs.ticker}` : null,
    currentInputs.timeframe ? `Current timeframe: ${currentInputs.timeframe}` : null,
    currentInputs.holdingPeriod
      ? `Current holding period: ${currentInputs.holdingPeriod}`
      : null,
    currentInputs.riskPercent ? `Current risk: ${currentInputs.riskPercent}` : null,
    currentInputs.chartNote ? `Current chart note: ${currentInputs.chartNote}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const text =
    `Latest plain-English message:\n${message}\n\n` +
    (context ? `Existing builder state:\n${context}\n\n` : "") +
    "Return the merged inputs and a short assistant message that says what you captured and what is still needed.";

  const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
    { type: "text", text },
  ];
  if (imageDataUrl) content.push({ type: "image", image: imageDataUrl });
  return content;
}

function cleanInputs(input: z.infer<typeof PartialInputsSchema>): PlanInputs {
  return {
    ticker: cleanString(input.ticker)?.toUpperCase() ?? "",
    timeframe: cleanString(input.timeframe) ?? "",
    holdingPeriod: input.holdingPeriod ?? "",
    riskPercent: FIXED_RISK_PERCENT,
    chartNote: cleanString(input.chartNote) ?? "",
  };
}

function mergeInputs(
  current: PlanInputs,
  next: IntakeResult["inputs"]
): PlanInputs {
  return {
    ticker: cleanString(next.ticker)?.toUpperCase() ?? current.ticker ?? "",
    timeframe: cleanString(next.timeframe) ?? current.timeframe ?? "",
    holdingPeriod: next.holdingPeriod ?? current.holdingPeriod ?? "",
    riskPercent: FIXED_RISK_PERCENT,
    chartNote: cleanString(next.chartNote) ?? current.chartNote ?? "",
  };
}

function cleanString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function heuristicIntake(message: string, currentInputs: PlanInputs): IntakeResult {
  const ticker = matchTicker(message) ?? currentInputs.ticker ?? null;
  const timeframe = matchTimeframe(message) ?? currentInputs.timeframe ?? null;
  const holdingPeriod = matchHoldingPeriod(message) ?? currentInputs.holdingPeriod ?? null;
  const riskPercent = FIXED_RISK_PERCENT;
  const chartNote =
    message.trim().length >= 80 ? message.trim() : currentInputs.chartNote ?? null;

  return {
    inputs: {
      ticker: ticker || null,
      timeframe: timeframe || null,
      holdingPeriod:
        holdingPeriod === "Scalp" ||
        holdingPeriod === "Day" ||
        holdingPeriod === "Swing" ||
        holdingPeriod === "Position"
          ? holdingPeriod
          : null,
      riskPercent,
      chartNote: chartNote || null,
    },
    userQuestion: /\?/.test(message) ? message.trim() : null,
    assistantMessage:
      "I captured what I could from that. Add any missing asset, timeframe, holding period, or concrete chart levels before building the plan.",
    extractedFields: [],
    confidence: "low",
  };
}

function withFixedRiskNotice(message: string): string {
  const notice = `Planifier keeps risk fixed at ${FIXED_RISK_PERCENT}, so I kept the plan there.`;
  return message.includes(notice) ? message : `${message} ${notice}`;
}

function matchTicker(message: string): string | null {
  const explicitPair = message.match(/\b[A-Z]{2,6}\/[A-Z]{2,6}\b/i)?.[0];
  if (explicitPair) return explicitPair.toUpperCase();
  const symbol = message.match(/\b[A-Z]{2,5}\b/)?.[0];
  return symbol ? symbol.toUpperCase() : null;
}

function matchTimeframe(message: string): string | null {
  const match = message.match(/\b(1m|3m|5m|15m|30m|1h|2h|4h|6h|12h|1d|1w|daily|weekly|monthly)\b/i)?.[0];
  if (!match) return null;
  if (/^\d+h$/i.test(match)) return match.toUpperCase();
  if (/^\d+d$/i.test(match)) return match.toUpperCase();
  if (/^\d+w$/i.test(match)) return match.toUpperCase();
  return match;
}

function matchRisk(message: string): string | null {
  const match = message.match(/\b(\d+(?:\.\d+)?)\s?%\b/)?.[0];
  return match ?? null;
}

function matchHoldingPeriod(message: string): PlanInputs["holdingPeriod"] | null {
  if (/\bscalp|scalping\b/i.test(message)) return "Scalp";
  if (/\bday\s?trade|intraday|same day\b/i.test(message)) return "Day";
  if (/\bswing\b/i.test(message)) return "Swing";
  if (/\bposition|weeks|months\b/i.test(message)) return "Position";
  return null;
}
