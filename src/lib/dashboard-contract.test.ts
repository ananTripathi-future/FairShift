import { describe, expect, it } from "vitest";
import { parseDashboard, parseCommandResult } from "./dashboard-contract";

const id = "123e4567-e89b-12d3-a456-426614174000";
const base = {
  profile: { id, name: "Test", language: "en", skills: [] },
  membership: null,
  period: "2026-10",
};
describe("RPC response contracts", () => {
  it("accepts an account awaiting site membership", () => {
    expect(parseDashboard(base)).toEqual(base);
  });
  it("accepts the worker site projection without an invitation code", () => {
    const site = {
      id,
      name: "Test site",
      supervisor_id: id,
      manager_id: id,
      low_hours: 72,
      medium_hours: 24,
      high_hours: 4,
      location_required: false,
      latitude: null,
      longitude: null,
      radius_m: 150,
      daily_regular_minutes: 480,
      overtime_multiplier_pct: 150,
    };
    expect(parseDashboard({ ...base, site }).site).toEqual(site);
  });
  it("rejects missing profiles and malformed payroll at the boundary", () => {
    expect(() => parseDashboard({ ...base, profile: null })).toThrow("Workspace data");
    expect(() =>
      parseDashboard({ ...base, payroll: [{ worker_id: id, rate_paise: "100" }] }),
    ).toThrow("Workspace data");
  });
  it("rejects invalid membership roles and month values", () => {
    expect(() =>
      parseDashboard({ ...base, membership: { user_id: id, site_id: id, role: "admin" } }),
    ).toThrow();
    expect(() => parseDashboard({ ...base, period: "2026-13" })).toThrow();
  });
  it("accepts empty mutation acknowledgements and QR/report results", () => {
    expect(parseCommandResult({})).toEqual({});
    expect(parseCommandResult({ token: id, expires_at: "2026-10-27T12:00:00+00:00" }).token).toBe(
      id,
    );
    expect(parseCommandResult({ id, reference: "SV-TEST" }).reference).toBe("SV-TEST");
  });
  it("rejects malformed command results without pretending success", () => {
    expect(() => parseCommandResult(null)).toThrow("unreadable result");
    expect(() => parseCommandResult({ token: 123 })).toThrow();
  });
});
