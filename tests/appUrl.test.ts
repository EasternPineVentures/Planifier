import { describe, expect, it } from "vitest";
import {
  PLANIFIER_DEFAULT_APP_URL,
  normalizeAppUrl,
} from "@/lib/appUrl";

describe("normalizeAppUrl", () => {
  it("defaults to planifier.cloud", () => {
    expect(normalizeAppUrl().origin).toBe(PLANIFIER_DEFAULT_APP_URL);
  });

  it("adds https when a bare production domain is provided", () => {
    expect(normalizeAppUrl("planifier.cloud").origin).toBe(
      PLANIFIER_DEFAULT_APP_URL,
    );
  });

  it("keeps local http origins for development", () => {
    expect(normalizeAppUrl("http://localhost:3000/foo").origin).toBe(
      "http://localhost:3000",
    );
  });

  it("upgrades non-local http origins to https", () => {
    expect(normalizeAppUrl("http://planifier.cloud/foo").origin).toBe(
      PLANIFIER_DEFAULT_APP_URL,
    );
  });
});
