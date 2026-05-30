import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedRuntimePrompt: string | null = null;

export function getRuntimeSystemPrompt(): string {
  if (cachedRuntimePrompt) return cachedRuntimePrompt;
  const path = join(process.cwd(), "prompts", "runtime-system-prompt.md");
  cachedRuntimePrompt = readFileSync(path, "utf8");
  return cachedRuntimePrompt;
}
