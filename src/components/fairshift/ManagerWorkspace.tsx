import { SiteAccess } from "./SiteAccess";
import { PayrollReview } from "./PayrollReview";
import { AttendanceReview } from "./AttendanceReview";
import { ShiftScheduling } from "./ShiftScheduling";
import { Button } from "@/components/ui/button";
import { Panel, Shell, Tag } from "@/components/Shell";
import { Reports } from "./SafeVoice";
import { dateTime, type Dashboard } from "@/lib/workflows";
import { hrs } from "@/lib/pay";
import { LocationSettings } from "./LocationSettings";
import { permissions } from "@/lib/permissions";
import { Notes, OvertimeRules } from "./RoleTools";
import { calcPay } from "@/lib/pay";
export function ManagerWorkspace({ d }: { d: Dashboard }) {
  const access = permissions(d.membership?.role);
  return (
    <Shell title={`${d.site?.name} · site overview`}>
      <p className="mb-5 text-sm font-medium capitalize">
        {d.membership?.role} · Level {access.level}
      </p>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["On shift", d.shifts?.filter((s) => s.check_in && !s.check_out).length],
          ["People", d.people?.length],
          ["Unresolved safety", d.reports?.filter((r) => r.status !== "Resolved").length],
          access.payroll
            ? ["Open pay disputes", d.disputes?.filter((r) => r.status === "Open").length]
            : [
                "Missing attendance",
                d.shifts?.filter((s) => Date.parse(s.scheduled_start) < Date.now() && !s.check_in)
                  .length,
              ],
        ].map(([name, value]) => (
          <div key={String(name)} className="border-l-2 border-accent pl-3">
            <p className="text-2xl font-semibold">{value ?? 0}</p>
            <p className="text-xs text-muted-foreground">{name}</p>
          </div>
        ))}
      </div>
      <Panel title="Workforce impact" className="mb-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Verified shifts", d.shifts?.filter((s) => s.verified_at).length ?? 0],
            [
              "Recorded hours",
              hrs(
                (d.shifts ?? []).reduce(
                  (n, s) =>
                    n +
                    (s.check_in && s.check_out
                      ? Math.round((Date.parse(s.check_out) - Date.parse(s.check_in)) / 60000)
                      : 0),
                  0,
                ),
              ),
            ],
            ["Hazards resolved", d.reports?.filter((r) => r.status === "Resolved").length ?? 0],
            [
              "Pay disputes resolved",
              d.disputes?.filter((r) => r.status === "Resolved").length ?? 0,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xl font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </Panel>
      {access.manageAccess && (
        <div className="mb-5">
          <LocationSettings d={d} />
        </div>
      )}
      <ShiftScheduling d={d} />
      <AttendanceReview d={d} />
      <PayrollReview d={d} />
      <Panel title="Overtime & fatigue review" className="mt-5">
        <ul className="space-y-3">
          {d.people?.map((p) => {
            const completed = (d.shifts ?? [])
              .filter((s) => s.worker_id === p.id && s.check_in && s.check_out)
              .flatMap((s) =>
                s.check_in && s.check_out
                  ? [{ checkIn: Date.parse(s.check_in), checkOut: Date.parse(s.check_out) }]
                  : [],
              );
            const pay = calcPay(completed, 0, 0, {
              dailyRegularMinutes: d.site?.daily_regular_minutes ?? 480,
              overtimeMultiplierPct: d.site?.overtime_multiplier_pct ?? 150,
            });
            return (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm">
                <span>{p.name}</span>
                <span>
                  {hrs(pay.regMin + pay.otMin)} recorded · {hrs(pay.otMin)} overtime{" "}
                  {pay.otMin > 0 && <Tag>Overtime review</Tag>}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Notes d={d} staff />
        {access.payroll && <OvertimeRules d={d} />}
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Reports d={d} manager />
        <SiteAccess d={d} />
      </div>
      <Panel title="Auditable action history" className="mt-5">
        {access.payroll && (
          <Button
            variant="outline"
            size="sm"
            className="mb-3"
            onClick={() => {
              const rows = [
                ["Date", "Actor", "Action"],
                ...(d.events ?? []).map((e) => [e.created_at, e.actor, e.action]),
              ];
              const csv = rows
                .map((r) =>
                  r
                    .map(
                      (v) =>
                        `"${String(v)
                          .replace(/^[=+@-]/, "'$&")
                          .replaceAll('"', '""')}"`,
                    )
                    .join(","),
                )
                .join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "fairshift-site-audit.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export audit report
          </Button>
        )}
        <ul className="max-h-96 space-y-2 overflow-auto text-xs">
          {d.events?.map((ev) => (
            <li key={ev.id}>
              {dateTime(ev.created_at)} · <strong>{ev.actor}</strong> · {ev.action}
              <span className="block break-words font-mono text-muted-foreground">
                {JSON.stringify(ev.details)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </Shell>
  );
}
