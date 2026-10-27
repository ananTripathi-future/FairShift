import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Tag, field } from "@/components/Shell";
import { hrs, inr } from "@/lib/pay";
import { dateTime, type Dashboard } from "@/lib/workflows";
import { workerPay } from "@/lib/worker-pay";
import { useCommand } from "@/lib/use-dashboard";
export function FairPay({ d }: { d: Dashboard }) {
  const { terms, pay } = workerPay(d, d.profile.id);
  const [why, setWhy] = useState(false);
  const [line, setLine] = useState<
    "Base pay" | "Overtime" | "Allowances" | "Deductions" | "Net payable"
  >("Base pay");
  const cmd = useCommand();
  const rows: [typeof line, number, string][] = [
    ["Base pay", pay.regular, `${hrs(pay.regMin)} × ${inr(terms?.rate_paise ?? 0)} per hour.`],
    [
      "Overtime",
      pay.overtime,
      `${hrs(pay.otMin)} × ${inr(((terms?.rate_paise ?? 0) * (d.site?.overtime_multiplier_pct ?? 150)) / 100)} per hour; hours beyond ${(d.site?.daily_regular_minutes ?? 480) / 60} per IST day.`,
    ],
    ["Allowances", pay.allowances, "Your manager's recorded monthly allowance."],
    ["Deductions", -pay.deductions, "Your manager's recorded monthly deduction."],
    [
      "Net payable",
      pay.net,
      `${inr(pay.regular)} base + ${inr(pay.overtime)} overtime + ${inr(pay.allowances)} allowances − ${inr(pay.deductions)} deductions.`,
    ],
  ];
  return (
    <Panel title={`FairPay · ${d.period}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-3xl font-semibold">{inr(pay.net)}</p>
        <Tag>{terms?.approved_month === d.period ? "Approved" : "Estimate"}</Tag>
      </div>
      {!terms?.rate_paise && (
        <p className="my-2 text-sm text-destructive">Your hourly rate has not been set.</p>
      )}
      <Button
        className="my-4 max-w-full whitespace-normal"
        variant="outline"
        onClick={() => setWhy(!why)}
        aria-expanded={why}
      >
        <CircleHelp />
        Why am I getting this amount?
      </Button>
      <div className="space-y-3">
        {rows.map(([name, value, explanation]) => (
          <div key={name} className="border-b pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 font-medium">{name}</span>
              <span className="font-mono text-sm">{inr(value)}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLine(name)}
                aria-label={`Dispute ${name}`}
              >
                Dispute
              </Button>
            </div>
            <meter
              className="mt-2 h-2 w-full accent-accent"
              min={0}
              max={Math.max(pay.gross, pay.deductions, 1)}
              value={Math.abs(value)}
              aria-label={`${name} proportion`}
            />
            {why && <p className="mt-2 text-sm text-muted-foreground">{explanation}</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Site policy: {(d.site?.overtime_multiplier_pct ?? 150) / 100}× overtime after{" "}
        {(d.site?.daily_regular_minutes ?? 480) / 60} hours per IST day. Approval is not proof of
        payment.{terms?.approved_at && ` Approved ${dateTime(terms.approved_at)}.`}
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          await cmd.mutateAsync({
            action: "dispute",
            data: { line, text: String(new FormData(form).get("text")) },
          });
          form.reset();
        }}
      >
        <label className="block text-sm">
          Question this line
          <select
            className={field}
            value={line}
            onChange={(e) => {
              const v = rows.find((r) => r[0] === e.target.value)?.[0];
              if (v) setLine(v);
            }}
          >
            {rows.map((r) => (
              <option key={r[0]}>{r[0]}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          What seems incorrect?
          <textarea className={field} name="text" required minLength={10} maxLength={500} />
        </label>
        <Button disabled={cmd.isPending}>Send pay dispute</Button>
      </form>
      <ul className="mt-5 space-y-3">
        {(d.disputes ?? [])
          .filter((q) => q.worker_id === d.profile.id)
          .map((q) => (
            <li key={q.id} className="border-t pt-3 text-sm">
              <p>
                <Tag>{q.status}</Tag> {q.line} · {q.period} · {q.id.slice(0, 8)}
              </p>
              <p>{q.text}</p>
              {q.reply && <p className="mt-1 text-accent">Reply: {q.reply}</p>}
            </li>
          ))}
      </ul>
    </Panel>
  );
}
