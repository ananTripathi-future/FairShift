import { describe, expect, it } from "vitest";
import { calcPay } from "./pay";

const h = 3600000;
describe("calcPay", () => {
  it("pays overtime at 1.5x beyond 8 hours a day", () => {
    const r = calcPay([{ checkIn: 0, checkOut: 10 * h }], 10000, 0);
    expect(r.regular).toBe(80000);
    expect(r.overtime).toBe(30000);
    expect(r.gross).toBe(110000);
  });
  it("subtracts deductions from gross", () => {
    expect(calcPay([{ checkIn: 0, checkOut: 8 * h }], 10000, 5000).net).toBe(75000);
  });
  it("aggregates split shifts before applying the eight-hour daily threshold", () => {
    const p = calcPay(
      [
        { checkIn: 0, checkOut: 5 * h },
        { checkIn: 6 * h, checkOut: 11 * h },
      ],
      10000,
      0,
    );
    expect(p.regMin).toBe(480);
    expect(p.otMin).toBe(120);
    expect(p.net).toBe(110000);
  });
  it("includes allowances in gross and net", () => {
    const p = calcPay([{ checkIn: 0, checkOut: 8 * h }], 10000, 5000, undefined, 10000);
    expect(p.gross).toBe(90000);
    expect(p.net).toBe(85000);
  });
});
