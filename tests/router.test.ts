import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY_V2;
  delete process.env.BLACKBOX_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.HF_TOKEN;
  delete process.env.HUGGINGFACE_API_KEY;
  delete process.env.PLANIFIER_MODEL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("model router provider behavior", () => {
  it("does not require Hugging Face when OpenAI is configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.PLANIFIER_MODEL = "auto";

    const { pickModel } = await import("@/lib/ai/router");
    const pick = pickModel({ task: "chat" });

    expect(pick.label).toBe("openai:gpt-4o-mini");
  });

  it("allows explicit Hugging Face provider override", async () => {
    process.env.HF_TOKEN = "hf_test";
    process.env.PLANIFIER_MODEL = "huggingface";

    const { pickModel } = await import("@/lib/ai/router");
    const pick = pickModel({ task: "chat" });

    expect(pick.label.startsWith("forced:huggingface:")).toBe(true);
  });
});
