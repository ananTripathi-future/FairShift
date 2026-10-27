import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Panel, Shell, Tag, field } from "@/components/Shell";
import { Reports } from "./SafeVoice";
import { workerPay } from "./FairPay";
import { useCommand } from "@/lib/use-dashboard";
import { dateTime, type Dashboard } from "@/lib/workflows";
import { hrs, inr } from "@/lib/pay";
import { toast } from "sonner";
import { LocationSettings } from "./LocationSettings";
import { permissions, canDecide, type SiteRole } from "@/lib/permissions";
import { Notes, OvertimeRules, ShiftTools } from "./RoleTools";
import { calcPay } from "@/lib/pay";
export function ManagerWorkspace({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  const access = permissions(d.membership?.role);
  const [qr, setQr] = useState<{ token?: string; expires_at?: string }>({});
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
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Site QR · attendance">
          <Button
            disabled={cmd.isPending}
            onClick={async () => setQr(await cmd.mutateAsync({ action: "qr", data: {} }))}
          >
            Generate 5-minute site QR
          </Button>
          {qr.token && (
            <div className="mt-4 space-y-3">
              <QRCodeSVG
                value={`${window.location.origin}/worker?token=${qr.token}`}
                size={180}
                title="Site attendance QR"
              />
              <p className="break-all font-mono text-xs">fairshift:{qr.token}</p>
              <p className="text-xs text-muted-foreground">
                Workers can scan this with their phone camera — it opens FairShift directly — or use
                "Scan site QR" inside the app.
              </p>
              <p className="text-xs">
                Expires {qr.expires_at ? dateTime(qr.expires_at) : "in 5 minutes"}
              </p>
            </div>
          )}
          <p className="mt-4 break-all text-sm">
            Worker invitation: <span className="font-mono">{d.site?.join_code}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {d.site?.location_required
              ? `Location check enabled · ${d.site.radius_m} m radius.`
              : "QR verifies assignment and expiry. Site location check is not enabled."}
          </p>
        </Panel>
        <Panel title="Schedule a shift">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const start = new Date(`${f.get("start")}:00+05:30`);
              const end = new Date(`${f.get("end")}:00+05:30`);
              if (end <= start) {
                toast.error("Shift end must be after start");
                return;
              }
              await cmd.mutateAsync({
                action: "schedule",
                data: {
                  worker_id: String(f.get("worker")),
                  start: start.toISOString(),
                  end: end.toISOString(),
                },
              });
              form.reset();
              toast.success("Shift scheduled");
            }}
          >
            <label className="block text-sm">
              Worker
              <select className={field} name="worker">
                {d.people?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Start (IST)
              <input type="datetime-local" name="start" className={field} required />
            </label>
            <label className="block text-sm">
              End (IST)
              <input type="datetime-local" name="end" className={field} required />
            </label>
            <Button disabled={cmd.isPending}>Schedule shift</Button>
          </form>
        </Panel>
      </div>
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
                await cmd.mutateAsync({
                  action: "deadlines",
                  data: {
                    High: Number(f.get("High")),
                    Medium: Number(f.get("Medium")),
                    Low: Number(f.get("Low")),
                  },
                });
                toast.success("Deadlines saved");
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
function Decision({ id, kind }: { id: string; kind: "correction_decision" | "dispute_decision" }) {
  const cmd = useCommand();
  const [reply, setReply] = useState("");
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        cmd.mutate(
          kind === "correction_decision"
            ? { action: kind, data: { id, reply, status: "Approved" } }
            : { action: kind, data: { id, reply, status: "Resolved" } },
        );
      }}
    >
      <label className="block">
        Explanation
        <input
          className={field}
          required
          minLength={5}
          maxLength={500}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" disabled={cmd.isPending}>
          {kind === "correction_decision" ? "Approve correction" : "Resolve dispute"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cmd.isPending || reply.trim().length < 5}
          onClick={() => cmd.mutate({ action: kind, data: { id, reply, status: "Rejected" } })}
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
function PayTerms({ d, id }: { d: Dashboard; id: string }) {
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
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await cmd.mutateAsync({
            action: "pay_terms",
            data: {
              worker_id: id,
              rate: Math.round(Number(f.get("rate")) * 100),
              allowance: Math.round(Number(f.get("allowance")) * 100),
              deduction: Math.round(Number(f.get("deduction")) * 100),
            },
          });
          toast.success("Pay terms saved");
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
