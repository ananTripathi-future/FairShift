// All money in paise (integers) to avoid floating-point errors.
export type PayRules = { dailyRegularMinutes: number; overtimeMultiplierPct: number };
export const DEFAULT_RULES: PayRules = { dailyRegularMinutes: 480, overtimeMultiplierPct: 150 };

export type Shift = { checkIn: number; checkOut: number };

export function shiftMinutes(s: Shift) {
  return Math.max(0, Math.round((s.checkOut - s.checkIn) / 60000));
}

export function calcPay(
  shifts: Shift[],
  ratePaisePerHour: number,
  deductionsPaise: number,
  rules: PayRules = DEFAULT_RULES,
  allowancesPaise = 0,
) {
  let regMin = 0;
  let otMin = 0;
  const days = new Map<number, number>();
  for (const s of shifts) {
    let cursor = s.checkIn;
    while (cursor < s.checkOut) {
      const day = Math.floor((cursor + 19800000) / 86400000);
      const end = Math.min(s.checkOut, (day + 1) * 86400000 - 19800000);
      days.set(day, (days.get(day) ?? 0) + (end - cursor) / 60000);
      cursor = end;
    }
  }
  for (const minutes of days.values()) {
    const m = Math.round(minutes);
    regMin += Math.min(m, rules.dailyRegularMinutes);
    otMin += Math.max(0, m - rules.dailyRegularMinutes);
  }
  const regular = Math.round((regMin * ratePaisePerHour) / 60);
  const overtime = Math.round((otMin * ratePaisePerHour * rules.overtimeMultiplierPct) / 6000);
  const gross = regular + overtime + allowancesPaise;
  return {
    regMin,
    otMin,
    regular,
    overtime,
    allowances: allowancesPaise,
    gross,
    deductions: deductionsPaise,
    net: gross - deductionsPaise,
  };
}

export const inr = (paise: number) =>
  "₹" +
  (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const hrs = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
