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

export function SiteAccess({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  const access = permissions(d.membership?.role);
  return (
    <>
      {access.manageAccess && (
        <Panel title="Response deadlines & site access">
          <p className="mb-3 text-xs text-muted-foreground">
            New reports use these deadlines. Existing deadlines stay unchanged. Overdue cases
            escalate automatically within one hour; reminders appear in workers' accounts.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              cmd.mutate(
                {
                  action: "deadlines",
                  data: {
                    High: Number(f.get("High")),
                    Medium: Number(f.get("Medium")),
                    Low: Number(f.get("Low")),
                  },
                },
                { onSuccess: () => toast.success("Deadlines saved") },
              );
            }}
          >
            {(["High", "Medium", "Low"] as const).map((sev) => (
              <label key={sev} className="block text-sm">
                {sev} · hours
                <input
                  className={field}
                  type="number"
                  name={sev}
                  min={1}
                  max={720}
                  defaultValue={
                    sev === "High"
                      ? d.site?.high_hours
                      : sev === "Medium"
                        ? d.site?.medium_hours
                        : d.site?.low_hours
                  }
                  required
                />
              </label>
            ))}
            <Button disabled={cmd.isPending}>Save deadlines</Button>
          </form>
          <div className="mt-5 space-y-3">
            {d.people
              ?.filter((p) => p.id !== d.profile.id && p.id !== d.site?.manager_id)
              .map((p) => (
                <label key={p.id} className="block text-sm">
                  {p.name}
                  <select
                    className={field}
                    value={p.role}
                    onChange={(e) =>
                      cmd.mutate({
                        action: "role",
                        data: { worker_id: p.id, role: e.target.value as SiteRole },
                      })
                    }
                  >
                    <option value="worker">Worker</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                  </select>
                </label>
              ))}
          </div>
        </Panel>
      )}
    </>
  );
}
