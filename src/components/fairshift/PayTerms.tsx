import { Button } from "@/components/ui/button";
import { Tag, field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
import type { Dashboard } from "@/lib/workflows";
import { hrs, inr } from "@/lib/pay";
import { workerPay } from "@/lib/worker-pay";
import { toast } from "sonner";
export function PayTerms({ d, id }: { d: Dashboard; id: string }) {
  const cmd = useCommand();
  const { terms, pay } = workerPay(d, id);
  return (
    <div className="border-b pb-5">
      <div className="flex justify-between gap-2">
        <h3 className="font-medium">{d.people?.find((p) => p.id === id)?.name}</h3>
        <Tag>{terms?.approved_month === d.period ? "Approved" : "Estimate"}</Tag>
      </div>
      <p className="my-2 font-mono">
        {inr(pay.net)} · {hrs(pay.otMin)} overtime
      </p>
      <form
        className="grid grid-cols-3 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          cmd.mutate(
            {
              action: "pay_terms",
              data: {
                worker_id: id,
                rate: Math.round(Number(f.get("rate")) * 100),
                allowance: Math.round(Number(f.get("allowance")) * 100),
                deduction: Math.round(Number(f.get("deduction")) * 100),
              },
            },
            { onSuccess: () => toast.success("Pay terms saved") },
          );
        }}
      >
        {[
          ["rate", "₹ / hour", terms?.rate_paise ?? 0],
          ["allowance", "Allowances ₹", terms?.allowance_paise ?? 0],
          ["deduction", "Deductions ₹", terms?.deduction_paise ?? 0],
        ].map(([name, label, value]) => (
          <label key={name} className="min-w-0 text-xs">
            {label}
            <input
              className={field}
              name={String(name)}
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={Number(value) / 100}
            />
          </label>
        ))}
        <Button className="col-span-3" variant="outline" size="sm" disabled={cmd.isPending}>
          Save pay terms
        </Button>
      </form>
      <Button
        className="mt-3"
        size="sm"
        disabled={cmd.isPending || terms?.approved_month === d.period}
        onClick={() => cmd.mutate({ action: "approve_pay", data: { worker_id: id } })}
      >
        Approve this month's pay
      </Button>
    </div>
  );
}
