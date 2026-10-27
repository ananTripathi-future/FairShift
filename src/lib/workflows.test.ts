import { describe, expect, it } from "vitest";
import {
  commandSchema,
  isOverdue,
  parseQR,
  periodOf,
  validateMedia,
  locationSchema,
} from "./workflows";
describe("workforce rules", () => {
  it("rejects invalid location coordinates and negative accuracy", () => {
    expect(
      locationSchema.safeParse({ latitude: 91, longitude: 80, accuracy: 10, timestamp: 1 }).success,
    ).toBe(false);
    expect(
      locationSchema.safeParse({ latitude: 13, longitude: 80, accuracy: -1, timestamp: 1 }).success,
    ).toBe(false);
    expect(
      commandSchema.safeParse({
        action: "location_settings",
        data: { required: true, latitude: 13, longitude: 80, radius: 49 },
      }).success,
    ).toBe(false);
  });
  it("preserves a worker's skills and bounds record size", () => {
    expect(
      commandSchema.parse({ action: "skills", data: { skills: ["Masonry", "First aid"] } }).data,
    ).toEqual({ skills: ["Masonry", "First aid"] });
    expect(
      commandSchema.safeParse({ action: "skills", data: { skills: Array(21).fill("Masonry") } })
        .success,
    ).toBe(false);
  });
  it("decodes site QR but rejects non-UUID codes", () => {
    expect(parseQR("fairshift:123e4567-e89b-12d3-a456-426614174000")).toBe(
      "123e4567-e89b-12d3-a456-426614174000",
    );
    expect(() => parseQR("https://attacker.example")).toThrow();
  });
  it("decodes a scanned QR link carrying the token", () => {
    expect(
      parseQR(
        "https://bright-little-utility.lovable.app/worker?token=123e4567-e89b-12d3-a456-426614174000",
      ),
    ).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(() => parseQR("https://attacker.example/worker?token=not-a-uuid")).toThrow();
  });
  it("flags unresolved cases strictly past deadline", () => {
    expect(
      isOverdue(
        { status: "Under Review", due_at: "2026-10-27T00:00:00Z" },
        Date.parse("2026-10-27T01:00:00Z"),
      ),
    ).toBe(true);
    expect(
      isOverdue(
        { status: "Resolved", due_at: "2026-10-27T00:00:00Z" },
        Date.parse("2026-10-27T01:00:00Z"),
      ),
    ).toBe(false);
  });
  it("assigns month at the IST boundary", () => {
    expect(periodOf("2026-10-31T18:30:00Z")).toBe("2026-11");
    expect(periodOf("2026-10-31T18:29:00Z")).toBe("2026-10");
  });
  it("accepts manager-issued supervisor appointments and rejects unknown roles", () => {
    expect(
      commandSchema.safeParse({
        action: "role",
        data: { worker_id: "123e4567-e89b-12d3-a456-426614174000", role: "supervisor" },
      }).success,
    ).toBe(true);
    expect(
      commandSchema.safeParse({
        action: "role",
        data: { worker_id: "123e4567-e89b-12d3-a456-426614174000", role: "admin" },
      }).success,
    ).toBe(false);
  });
  it("requires an explanation when resolving pay disputes", () => {
    expect(
      commandSchema.safeParse({
        action: "dispute_decision",
        data: { id: "123e4567-e89b-12d3-a456-426614174000", status: "Resolved", reply: "" },
      }).success,
    ).toBe(false);
  });
  it("accepts a cancel-shift command with a shift id", () => {
    expect(
      commandSchema.safeParse({
        action: "cancel_shift",
        data: { id: "123e4567-e89b-12d3-a456-426614174000" },
      }).success,
    ).toBe(true);
    expect(commandSchema.safeParse({ action: "cancel_shift", data: {} }).success).toBe(false);
  });
  it("limits evidence count, size and types", () => {
    expect(() => validateMedia([{ type: "image/png", size: 10 * 1024 * 1024 }])).not.toThrow();
    expect(() => validateMedia([{ type: "image/png", size: 10 * 1024 * 1024 + 1 }])).toThrow();
    expect(() =>
      validateMedia(Array.from({ length: 4 }, () => ({ type: "image/png", size: 100 }))),
    ).toThrow();
    expect(() => validateMedia([{ type: "text/html", size: 100 }])).toThrow();
  });
});
