import { describe, expect, it } from "vitest";
import { check, disputeInput, replyInput, safetyInput, savedState } from "./validate";

describe("input validation", () => {
  it("rejects pay queries shorter than 10 characters", () => {
    expect(check(disputeInput, { text: "short" }).ok).toBe(false);
  });
  it("rejects pay queries longer than 500 characters", () => {
    expect(check(disputeInput, { text: "a".repeat(501) }).ok).toBe(false);
  });
  it("strips control characters and trims", () => {
    const r = check(disputeInput, { text: "  overtime\u0000 missing today " });
    expect(r.ok && r.data.text).toBe("overtime  missing today");
  });
  it("requires a location on safety reports", () => {
    const r = check(safetyInput, {
      category: "Other",
      severity: "High",
      location: " ",
      text: "Broken ladder on site",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects unknown severity values", () => {
    const r = check(safetyInput, {
      category: "Other",
      severity: "Extreme",
      location: "Gate 2",
      text: "Broken ladder on site",
    });
    expect(r.ok).toBe(false);
  });
  it("requires manager replies of at least 5 characters", () => {
    expect(check(replyInput, "ok").ok).toBe(false);
    expect(check(replyInput, "Added 30 min overtime").ok).toBe(true);
  });
  it("rejects tampered saved data", () => {
    expect(savedState.safeParse({ workers: "hack" }).success).toBe(false);
  });
});
