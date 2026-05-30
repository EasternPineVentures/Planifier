import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We import the route inside each test so env mutations and module mocks
// apply before the module is evaluated.

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  // Strip env so each test sets exactly what it needs.
  delete process.env.OPENAI_API_KEY;
  delete process.env.HF_TOKEN;
  delete process.env.HUGGINGFACE_API_KEY;
  delete process.env.DATABASE_URL;
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  delete process.env.CLERK_SECRET_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("/api/health response shape", () => {
  it("reports missing env vars without exposing values", async () => {
    // Mock neon so importing the route doesn't try a real connection.
    vi.doMock("@neondatabase/serverless", () => ({
      neon: () => async () => [{ ok: 1 }],
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(body.app).toBe("planifier");
    expect(typeof body.timestamp).toBe("string");
    expect(body.openai).toBe("missing");
    expect(body.ai.huggingface).toBe("missing");
    expect(body.auth).toBe("missing");
    expect(body.database).toBe("not_configured");
    expect(body.ok).toBe(false);
    // No secret leakage.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/sk-/);
    expect(serialized).not.toMatch(/postgresql:\/\//);
  });

  it("returns ok=true and 200 when everything is configured and DB responds", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.DATABASE_URL = "postgresql://x:y@host/db";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    process.env.CLERK_SECRET_KEY = "sk_test";

    vi.doMock("@neondatabase/serverless", () => ({
      neon: () => async () => [{ ok: 1 }],
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.database).toBe("connected");
    expect(body.auth).toBe("configured");
    expect(body.openai).toBe("configured");
    expect(body.ai.huggingface).toBe("missing");
  });

  it("reports huggingface configured when HF_TOKEN is present", async () => {
    process.env.HF_TOKEN = "hf_test";
    process.env.DATABASE_URL = "postgresql://x:y@host/db";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    process.env.CLERK_SECRET_KEY = "sk_test";

    vi.doMock("@neondatabase/serverless", () => ({
      neon: () => async () => [{ ok: 1 }],
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ai.huggingface).toBe("configured");
    expect(body.ai.anyConfigured).toBe(true);
    expect(body.ok).toBe(true);
  });

  it("returns 500 when DB query fails", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.DATABASE_URL = "postgresql://x:y@host/db";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    process.env.CLERK_SECRET_KEY = "sk_test";

    vi.doMock("@neondatabase/serverless", () => ({
      neon: () => async () => {
        throw new Error("boom");
      },
    }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.database).toBe("error");
  });
});
