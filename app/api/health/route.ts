import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
// Always evaluate fresh so a degraded service is detected immediately.
export const dynamic = "force-dynamic";

type Status = "configured" | "missing";
type DbStatus = "connected" | "error" | "not_configured";

type HealthResponse = {
  ok: boolean;
  app: "planifier";
  timestamp: string;
  database: DbStatus;
  auth: Status;
  openai: Status;
  ai: {
    anthropic: Status;
    blackbox: Status;
    openai: Status;
    huggingface: Status;
    mode: string;
    anyConfigured: boolean;
  };
};

function present(v: string | undefined): Status {
  return v && v.trim().length > 0 ? "configured" : "missing";
}

export async function GET() {
  const timestamp = new Date().toISOString();

  const openai = present(process.env.OPENAI_API_KEY);
  const anthropic: Status =
    present(process.env.ANTHROPIC_API_KEY) === "configured" ||
    present(process.env.ANTHROPIC_API_KEY_V2) === "configured"
      ? "configured"
      : "missing";
  const blackbox = present(process.env.BLACKBOX_API_KEY);
  const huggingface: Status =
    present(process.env.HF_TOKEN) === "configured" ||
    present(process.env.HUGGINGFACE_API_KEY) === "configured"
      ? "configured"
      : "missing";
  const anyAi =
    openai === "configured" ||
    anthropic === "configured" ||
    blackbox === "configured" ||
    huggingface === "configured";

  const dbVar = present(process.env.DATABASE_URL);
  const clerkPub = present(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const clerkSecret = present(process.env.CLERK_SECRET_KEY);
  const auth: Status =
    clerkPub === "configured" && clerkSecret === "configured"
      ? "configured"
      : "missing";

  let database: DbStatus = "not_configured";
  if (dbVar === "configured") {
    try {
      const sql = neon(process.env.DATABASE_URL!);
      await sql`select 1 as ok`;
      database = "connected";
    } catch {
      database = "error";
    }
  }

  const ok =
    database === "connected" &&
    auth === "configured" &&
    anyAi;

  const body: HealthResponse = {
    ok,
    app: "planifier",
    timestamp,
    database,
    auth,
    openai,
    ai: {
      anthropic,
      blackbox,
      openai,
      huggingface,
      mode: process.env.PLANIFIER_MODEL?.trim() || "auto",
      anyConfigured: anyAi,
    },
  };

  // 500 only when the DB check actively fails (per spec).
  return Response.json(body, { status: database === "error" ? 500 : 200 });
}
