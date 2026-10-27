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

export function AttendanceReview({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  const access = permissions(d.membership?.role);
  return (
    <>
      <Panel title="Attendance · verification" className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {["Worker", "Scheduled", "Recorded", "Status", "Action"].map((h) => (
                  <th key={h} scope="col" className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.shifts?.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{d.people?.find((p) => p.id === s.worker_id)?.name}</td>
                  <td className="p-2">{dateTime(s.scheduled_start)}</td>
                  <td className="p-2">
                    {s.check_in && s.check_out
                      ? hrs(Math.round((Date.parse(s.check_out) - Date.parse(s.check_in)) / 60000))
                      : s.check_in
                        ? "On shift"
                        : "—"}
                  </td>
                  <td className="p-2">
                    {s.verified_at
                      ? "Verified"
                      : s.check_out
                        ? "Checked out"
                        : s.check_in
                          ? "Checked in"
                          : "Scheduled"}
                  </td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        !s.check_out ||
                        Boolean(s.verified_at) ||
                        cmd.isPending ||
                        s.worker_id === d.profile.id
                      }
                      onClick={() => cmd.mutate({ action: "verify", data: { id: s.id } })}
                    >
                      Verify
                    </Button>
                    <ShiftTools shift={s} self={s.worker_id === d.profile.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Correction requests">
          <ul className="space-y-4">
            {d.corrections?.map((c) => (
              <li key={c.id} className="border-b pb-4 text-sm">
                <p>
                  {d.people?.find((p) => p.id === c.worker_id)?.name} · <Tag>{c.status}</Tag>
                </p>
                <p>
                  {dateTime(c.proposed_in)} → {dateTime(c.proposed_out)}
                </p>
                <p>{c.reason}</p>
                {c.reply && <p>Reply: {c.reply}</p>}
                {c.status === "Open" &&
                  canDecide(d.membership?.role, d.profile.id, c.worker_id) && (
                    <Decision id={c.id} kind="correction_decision" />
                  )}
              </li>
            ))}
          </ul>
        </Panel>
        {access.payroll && (
          <Panel title="FairPay · disputes">
            <ul className="space-y-4">
              {d.disputes?.map((r) => (
                <li key={r.id} className="border-b pb-4 text-sm">
                  <p>
                    {d.people?.find((p) => p.id === r.worker_id)?.name} · {r.line} · {r.period} ·{" "}
                    <Tag>{r.status}</Tag>
                  </p>
                  <p>{r.text}</p>
                  {r.reply && <p>Reply: {r.reply}</p>}
                  {r.status === "Open" &&
                    canDecide(d.membership?.role, d.profile.id, r.worker_id) && (
                      <Decision id={r.id} kind="dispute_decision" />
                    )}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
