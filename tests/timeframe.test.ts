import { describe, it, expect } from "vitest";
import { checkTimeframeAlignment, parseTimeframeMinutes } from "@/lib/plan/timeframe";

describe("parseTimeframeMinutes", () => {
  it("parses common shorthand", () => {
    expect(parseTimeframeMinutes("1m")).toBe(1);
    expect(parseTimeframeMinutes("5m")).toBe(5);
    expect(parseTimeframeMinutes("1h")).toBe(60);
    expect(parseTimeframeMinutes("4h")).toBe(240);
    expect(parseTimeframeMinutes("1d")).toBe(1440);
    expect(parseTimeframeMinutes("1w")).toBe(10080);
    expect(parseTimeframeMinutes("daily")).toBe(1440);
    expect(parseTimeframeMinutes("weekly")).toBe(10080);
  });

  it("returns null for unrecognized input", () => {
    expect(parseTimeframeMinutes("xyz")).toBeNull();
    expect(parseTimeframeMinutes("")).toBeNull();
  });
});

describe("checkTimeframeAlignment", () => {
  it("1m + swing → warning (or hard_warning)", () => {
    const r = checkTimeframeAlignment("1m", "swing");
    expect(r.ok).toBe(false);
    expect(["warning", "hard_warning"]).toContain(r.severity);
    expect(r.message).toBeTruthy();
  });

  it("5m + position → hard_warning", () => {
    const r = checkTimeframeAlignment("5m", "position");
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("hard_warning");
  });

  it("4H + swing → ok", () => {
    const r = checkTimeframeAlignment("4h", "swing");
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("none");
  });

  it("daily + position → ok", () => {
    const r = checkTimeframeAlignment("daily", "position");
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("none");
  });

  it("daily + scalp → hard_warning", () => {
    const r = checkTimeframeAlignment("daily", "scalp");
    expect(r.ok).toBe(false);
    expect(["warning", "hard_warning"]).toContain(r.severity);
  });

  it("unknown timeframe → treated as ok (cannot judge)", () => {
    const r = checkTimeframeAlignment("nonsense", "swing");
    expect(r.ok).toBe(true);
  });
});
