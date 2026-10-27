import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Panel, Tag, field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
import { dateTime, type Dashboard } from "@/lib/workflows";
import { hrs, inr } from "@/lib/pay";
import { toast } from "sonner";
import { permissions, canDecide, type SiteRole } from "@/lib/permissions";
import { ShiftTools } from "./RoleTools";
import { workerPay } from "@/lib/worker-pay";
import type { CommandResult } from "@/lib/dashboard-contract";

export function ShiftScheduling({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  const [qr, setQr] = useState<CommandResult>({});
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title="Site QR · attendance">
        <Button
          disabled={cmd.isPending}
          onClick={() => cmd.mutate({ action: "qr", data: {} }, { onSuccess: setQr })}
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
            cmd.mutate(
              {
                action: "schedule",
                data: {
                  worker_id: String(f.get("worker")),
                  start: start.toISOString(),
                  end: end.toISOString(),
                },
              },
              {
                onSuccess: () => {
                  form.reset();
                  toast.success("Shift scheduled");
                },
              },
            );
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
  );
}
