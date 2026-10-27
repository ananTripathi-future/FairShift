import { describe, expect, it } from "vitest";
import { workerPay } from "./worker-pay";
import type { Dashboard } from "./workflows";

const id = "123e4567-e89b-12d3-a456-426614174000";
const d: Dashboard = {
  profile: { id, name: "Test", language: "en", skills: [] },
  membership: null,
  period: "2026-10",
  payroll: [
    {
      worker_id: id,
      site_id: id,
      rate_paise: 10000,
      allowance_paise: 1000,
      deduction_paise: 500,
      approved_month: null,
      approved_at: null,
      approved_by: null,
    },
  ],
  shifts: [
    {
      id,
      site_id: id,
      worker_id: id,
      scheduled_start: "2026-10-31T17:30:00Z",
      scheduled_end: "2026-10-31T20:30:00Z",
      check_in: "2026-10-31T17:30:00Z",
      check_out: "2026-10-31T20:30:00Z",
      verified_at: null,
      verified_by: null,
    },
  ],
};
describe("worker payroll selection", () => {
  it("assigns the entire completed shift to its scheduled-start IST month", () => {
    expect(workerPay(d, id).pay.regular).toBe(30000);
    expect(workerPay({ ...d, period: "2026-11" }, id).pay.regular).toBe(0);
  });
  it("excludes incomplete shifts and other workers", () => {
    expect(
      workerPay({ ...d, shifts: d.shifts?.map((s) => ({ ...s, check_out: null })) }, id).pay
        .regular,
    ).toBe(0);
    expect(workerPay(d, "another-worker").pay.net).toBe(0);
  });
  it("keeps monthly allowances and deductions in the net estimate", () => {
    expect(workerPay(d, id).pay.net).toBe(30500);
  });
});
