import { describe, expect, it } from "vitest";
import { permissions, canDecide } from "./permissions";
describe("three-level site authority", () => {
  it("keeps workers at Level 1 without site operations", () => {
    expect(permissions("worker").level).toBe(1);
    expect(permissions("worker").operations).toBe(false);
  });
  it("allows supervisor Level 2 daily operations", () => {
    expect(permissions("supervisor").level).toBe(2);
    expect(permissions("supervisor").operations).toBe(true);
  });
  it("denies supervisor final payroll", () =>
    expect(permissions("supervisor").payroll).toBe(false));
  it("denies supervisor correction approval", () =>
    expect(permissions("supervisor").correctionDecision).toBe(false));
  it("denies supervisor account administration", () =>
    expect(permissions("supervisor").manageAccess).toBe(false));
  it("allows manager Level 3 payroll and site access management", () => {
    expect(permissions("manager").level).toBe(3);
    expect(permissions("manager").payroll).toBe(true);
    expect(permissions("manager").manageAccess).toBe(true);
  });
  it("prevents managers deciding their own records", () => {
    expect(canDecide("manager", "same-user", "same-user")).toBe(false);
    expect(canDecide("manager", "manager-user", "worker-user")).toBe(true);
  });
});
