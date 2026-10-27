import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/use-dashboard", () => ({
  useCommand: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
import { ShiftScheduling } from "./ShiftScheduling";
import { Decision } from "./Decision";
import { PayTerms } from "./PayTerms";
import type { Command } from "@/lib/workflows";
import type { Dashboard } from "@/lib/workflows";
const id = "123e4567-e89b-12d3-a456-426614174000";
const d: Dashboard = {
  profile: { id, name: "Test", skills: [], language: "en" },
  membership: { user_id: id, site_id: id, role: "manager" },
  period: "2026-10",
  people: [{ id, name: "Demo worker", role: "worker" }],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("manager action boundaries", () => {
  it("submits IST schedule times and resets only on success", () => {
    mocks.mutate.mockImplementation((_command: Command, options: { onSuccess?: () => void }) =>
      options.onSuccess?.(),
    );
    render(<ShiftScheduling d={d} />);
    fireEvent.change(screen.getByLabelText("Start (IST)"), {
      target: { value: "2026-10-28T08:00" },
    });
    fireEvent.change(screen.getByLabelText("End (IST)"), { target: { value: "2026-10-28T16:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule shift" }));
    expect(mocks.mutate.mock.calls[0]?.[0]).toEqual({
      action: "schedule",
      data: {
        worker_id: id,
        start: "2026-10-28T02:30:00.000Z",
        end: "2026-10-28T10:30:00.000Z",
      },
    });
    expect(screen.getByLabelText("Start (IST)")).toHaveValue("");
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });
  it("preserves schedule input when a failed mutation does not call success", () => {
    mocks.mutate.mockImplementation(() => {});
    render(<ShiftScheduling d={d} />);
    fireEvent.change(screen.getByLabelText("Start (IST)"), {
      target: { value: "2026-10-28T08:00" },
    });
    fireEvent.change(screen.getByLabelText("End (IST)"), { target: { value: "2026-10-28T16:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule shift" }));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Start (IST)")).toHaveValue("2026-10-28T08:00");
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("rejects reversed schedule times without sending a command", () => {
    render(<ShiftScheduling d={d} />);
    fireEvent.change(screen.getByLabelText("Start (IST)"), {
      target: { value: "2026-10-28T16:00" },
    });
    fireEvent.change(screen.getByLabelText("End (IST)"), { target: { value: "2026-10-28T08:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule shift" }));
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });
  it("keeps correction and dispute decision commands distinct", () => {
    render(<Decision id={id} kind="correction_decision" />);
    fireEvent.change(screen.getByLabelText("Explanation"), {
      target: { value: "Verified against log" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve correction" }));
    expect(mocks.mutate).toHaveBeenCalledWith({
      action: "correction_decision",
      data: {
        id,
        reply: "Verified against log",
        status: "Approved",
      },
    });
    cleanup();
    render(<Decision id={id} kind="dispute_decision" />);
    fireEvent.change(screen.getByLabelText("Explanation"), {
      target: { value: "Verified against log" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolve dispute" }));
    expect(mocks.mutate).toHaveBeenCalledWith({
      action: "dispute_decision",
      data: {
        id,
        reply: "Verified against log",
        status: "Resolved",
      },
    });
  });
  it("sends pay terms as integer paise and approvals as separate commands", () => {
    mocks.mutate.mockImplementation(() => {});
    render(<PayTerms d={d} id={id} />);
    fireEvent.change(screen.getByLabelText("₹ / hour"), { target: { value: "125.50" } });
    fireEvent.change(screen.getByLabelText("Allowances ₹"), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText("Deductions ₹"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save pay terms" }));
    expect(mocks.mutate.mock.calls[0]?.[0]).toEqual({
      action: "pay_terms",
      data: {
        worker_id: id,
        rate: 12550,
        allowance: 20000,
        deduction: 1000,
      },
    });
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Approve this month's pay" }));
    expect(mocks.mutate).toHaveBeenCalledWith({ action: "approve_pay", data: { worker_id: id } });
  });
});
