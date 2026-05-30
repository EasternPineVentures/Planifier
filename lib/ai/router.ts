import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type Task = "chat" | "plan";

export type ModelPick = {
  model: LanguageModel;
  label: string;
};

/**
 * Pricing/quality routing for Planifier.
 *
 * Doctrine: cheapest model that meets the task's quality bar.
 *  - "chat"  -> conversational streaming. DeepSeek (via Blackbox) by default.
 *  - "plan"  -> generateObject with strict zod schema, often with vision.
 *               Must be reliable for structured output: Anthropic Sonnet preferred.
 *  - needsVision forces a vision-capable model regardless of task.
 *
 * Env:
 *  - PLANIFIER_MODEL=auto  -> use routing rules below
 *  - PLANIFIER_MODEL=<id>  -> literal override, treated as an OpenAI-compatible
 *                              model id on the default OpenAI provider.
 *  - PROVIDERS_PREFERRED=anthropic,blackbox,openai  -> reorder fallback chain.
 *
 * Provider keys recognized:
 *   ANTHROPIC_API_KEY, OPENAI_API_KEY, BLACKBOX_API_KEY, HF_TOKEN.
 *   HUGGINGFACE_API_KEY is accepted as a fallback alias for HF_TOKEN.
 * Blackbox model ids are env-configurable so we don't ship stale names:
 *   BLACKBOX_CHAT_MODEL (default: "deepseek-chat")
 *   BLACKBOX_PLAN_MODEL (default: "anthropic/claude-3.5-sonnet")
 * Hugging Face OpenAI-compatible endpoint:
 *   https://router.huggingface.co/v1
 */

function firstPresent(...values: Array<string | undefined>): string | null {
  for (const v of values) {
    if (v && v.trim().length > 0) return v;
  }
  return null;
}

const blackboxClient = process.env.BLACKBOX_API_KEY
  ? createOpenAI({
      apiKey: process.env.BLACKBOX_API_KEY,
      baseURL: "https://api.blackbox.ai/v1",
    })
  : null;

const huggingfaceClient = firstPresent(
  process.env.HF_TOKEN,
  process.env.HUGGINGFACE_API_KEY
)
  ? createOpenAI({
      apiKey: firstPresent(process.env.HF_TOKEN, process.env.HUGGINGFACE_API_KEY)!,
      baseURL: "https://router.huggingface.co/v1",
    })
  : null;

function hasAnthropic() {
  return !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_API_KEY_V2;
}
function hasOpenAI() {
  return !!process.env.OPENAI_API_KEY;
}
function hasBlackbox() {
  return !!blackboxClient;
}
function hasHuggingFace() {
  return !!huggingfaceClient;
}

function anthropicModel(id: string): LanguageModel {
  // Allow a fallback secondary key if the primary is missing.
  if (!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY_V2) {
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY_V2;
  }
  return anthropic(id);
}

function blackboxModel(id: string): LanguageModel {
  if (!blackboxClient) throw new Error("Blackbox not configured");
  return blackboxClient(id);
}

function huggingFaceModel(id: string): LanguageModel {
  if (!huggingfaceClient) throw new Error("Hugging Face not configured");
  return huggingfaceClient(id);
}

type Provider = "anthropic" | "openai" | "blackbox" | "huggingface";

function preferredOrder(): Provider[] {
  const raw = process.env.PROVIDERS_PREFERRED;
  if (!raw) return ["anthropic", "blackbox", "openai"];
  const order = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Provider =>
      s === "anthropic" ||
      s === "openai" ||
      s === "blackbox" ||
      s === "huggingface"
    );
  return order.length ? order : ["anthropic", "blackbox", "openai"];
}

function planPick(provider: Provider): ModelPick | null {
  switch (provider) {
    case "anthropic":
      return hasAnthropic()
        ? { model: anthropicModel("claude-3-5-sonnet-latest"), label: "anthropic:sonnet" }
        : null;
    case "openai":
      return hasOpenAI()
        ? { model: openai("gpt-4o"), label: "openai:gpt-4o" }
        : null;
    case "blackbox":
      return hasBlackbox()
        ? {
            model: blackboxModel(
              process.env.BLACKBOX_PLAN_MODEL || "anthropic/claude-3.5-sonnet"
            ),
            label: "blackbox:plan",
          }
        : null;
    case "huggingface":
      // Hugging Face is not a default plan lane yet; allow only explicit forced override.
      return null;
  }
}

function chatPick(provider: Provider): ModelPick | null {
  switch (provider) {
    case "blackbox":
      return hasBlackbox()
        ? {
            model: blackboxModel(
              process.env.BLACKBOX_CHAT_MODEL || "deepseek-chat"
            ),
            label: "blackbox:chat",
          }
        : null;
    case "anthropic":
      return hasAnthropic()
        ? { model: anthropicModel("claude-3-5-haiku-latest"), label: "anthropic:haiku" }
        : null;
    case "openai":
      return hasOpenAI()
        ? { model: openai("gpt-4o-mini"), label: "openai:gpt-4o-mini" }
        : null;
    case "huggingface":
      return hasHuggingFace()
        ? {
            model: huggingFaceModel(
              process.env.HUGGINGFACE_CHAT_MODEL || "openai/gpt-oss-120b"
            ),
            label: "huggingface:chat",
          }
        : null;
  }
}

export function pickModel(opts: { task: Task; needsVision?: boolean }): ModelPick {
  const { task, needsVision = false } = opts;

  const forced = process.env.PLANIFIER_MODEL?.trim();
  if (forced && forced.toLowerCase() !== "auto") {
    if (forced.toLowerCase() === "huggingface") {
      const modelId =
        task === "plan"
          ? process.env.HUGGINGFACE_PLAN_MODEL || "Qwen/Qwen2.5-72B-Instruct"
          : process.env.HUGGINGFACE_CHAT_MODEL || "openai/gpt-oss-120b";
      return { model: huggingFaceModel(modelId), label: `forced:huggingface:${modelId}` };
    }
    if (forced.toLowerCase().startsWith("huggingface:")) {
      const modelId = forced.slice("huggingface:".length).trim();
      return { model: huggingFaceModel(modelId), label: `forced:huggingface:${modelId}` };
    }
    if (forced.startsWith("claude")) {
      return { model: anthropicModel(forced), label: `forced:${forced}` };
    }
    return { model: openai(forced), label: `forced:${forced}` };
  }

  // Vision OR structured-plan -> use the "plan-quality" chain.
  // (Plan flow needs reliable JSON adherence; vision needs a vision-capable model.)
  const useQualityChain = task === "plan" || needsVision;
  const order = preferredOrder();

  if (useQualityChain) {
    for (const p of order) {
      const pick = planPick(p);
      if (pick) return pick;
    }
  } else {
    // For cheap chat, prefer Blackbox/DeepSeek; Hugging Face is an optional fallback lane.
    const cheapOrder: Provider[] = ["blackbox", "anthropic", "openai", "huggingface"];
    for (const p of cheapOrder) {
      const pick = chatPick(p);
      if (pick) return pick;
    }
  }

  throw new Error(
    "No AI provider configured. Set ANTHROPIC_API_KEY, BLACKBOX_API_KEY, OPENAI_API_KEY, or HF_TOKEN in .env.local."
  );
}
