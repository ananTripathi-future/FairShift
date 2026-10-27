import { Button } from "@/components/ui/button";
import { Panel, Tag, field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
import { dateTime, type Dashboard } from "@/lib/workflows";
import { hrs } from "@/lib/pay";
import { toast } from "sonner";
import { permissions, canDecide, type SiteRole } from "@/lib/permissions";
import { ShiftTools } from "./RoleTools";
import { Decision } from "./Decision";
import { PayTerms } from "./PayTerms";

export function PayrollReview({ d }: { d: Dashboard }) {
  const access = permissions(d.membership?.role);
  return (
    <>
      {access.payroll && (
        <Panel title={`Payroll · ${d.period}`} className="mt-5">
          <div className="grid gap-5 md:grid-cols-2">
            {d.people
              ?.filter((p) => p.id !== d.profile.id)
              .map((p) => (
                <PayTerms key={p.id} d={d} id={p.id} />
              ))}
          </div>
        </Panel>
      )}
    </>
  );
}
