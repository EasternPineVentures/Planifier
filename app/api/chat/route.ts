import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { getRuntimeSystemPrompt } from "@/lib/prompts";
import {
  validateInputs,
  missingFieldsMessage,
  inferTimeframeMismatch,
  type PlanInputs,
} from "@/lib/validation";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatBody = {
  messages: CoreMessage[];
  inputs?: PlanInputs;
  imageDataUrl?: string | null;
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ChatBody;
  const { messages = [], inputs, imageDataUrl } = body;

  const planInputs: PlanInputs = {
    ...inputs,
    hasImage: !!imageDataUrl,
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastText =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
      ? lastUser!.content
          .map((p) => (p.type === "text" ? p.text : ""))
          .join(" ")
      : "";

  const wantsPlan =
    /\b(plan|analyze|analysis|setup|trade idea|build)\b/i.test(lastText || "");

  const missing = validateInputs(planInputs);
  if (wantsPlan && missing.length > 0) {
    return new Response(missingFieldsMessage(missing), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const systemPrompt = getRuntimeSystemPrompt();
  const contextLines: string[] = [];
  if (planInputs.ticker) contextLines.push(`Ticker: ${planInputs.ticker}`);
  if (planInputs.timeframe) contextLines.push(`Timeframe: ${planInputs.timeframe}`);
  if (planInputs.holdingPeriod) contextLines.push(`Holding period: ${planInputs.holdingPeriod}`);
  if (planInputs.riskPercent) contextLines.push(`Risk per trade: ${planInputs.riskPercent}`);
  if (planInputs.chartNote) contextLines.push(`Chart note: ${planInputs.chartNote}`);

  if (planInputs.timeframe && planInputs.holdingPeriod) {
    const mismatch = inferTimeframeMismatch(planInputs.timeframe, planInputs.holdingPeriod);
    if (mismatch) contextLines.push(`Timeframe mismatch warning: ${mismatch}`);
  }

  const contextBlock = contextLines.length
    ? `\n\n--- USER CONTEXT (validated by client) ---\n${contextLines.join("\n")}\n--- END CONTEXT ---`
    : "";

  // Inject image into the last user message as a multimodal part, if present.
  const enrichedMessages: CoreMessage[] = messages.map((m, i) => {
    if (i !== messages.length - 1 || m.role !== "user" || !imageDataUrl) return m;
    const text = typeof m.content === "string" ? m.content : "";
    return {
      role: "user",
      content: [
        { type: "text", text: text || "Here is the chart." },
        { type: "image", image: imageDataUrl },
      ],
    };
  });

  const model = openai(process.env.PLANIFIER_MODEL || "gpt-4o");

  const result = streamText({
    model,
    system: systemPrompt + contextBlock,
    messages: enrichedMessages,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
