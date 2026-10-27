import { calcPay, DEFAULT_RULES } from "./pay";
import { periodOf, type Dashboard } from "./workflows";

export function workerPay(d: Dashboard, id: string) {
  const terms = d.payroll?.find((p) => p.worker_id === id);
  const shifts = (d.shifts ?? [])
    .filter(
      (s) =>
        s.worker_id === id && s.check_in && s.check_out && periodOf(s.scheduled_start) === d.period,
    )
    .flatMap((s) =>
      s.check_in && s.check_out
        ? [{ checkIn: Date.parse(s.check_in), checkOut: Date.parse(s.check_out) }]
        : [],
    );
  return {
    terms,
    pay: calcPay(
      shifts,
      terms?.rate_paise ?? 0,
      terms?.deduction_paise ?? 0,
      {
        dailyRegularMinutes: d.site?.daily_regular_minutes ?? DEFAULT_RULES.dailyRegularMinutes,
        overtimeMultiplierPct:
          d.site?.overtime_multiplier_pct ?? DEFAULT_RULES.overtimeMultiplierPct,
      },
      terms?.allowance_paise ?? 0,
    ),
  };
}
