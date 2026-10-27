import { useEffect, useRef, useState } from "react";
import { Camera, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, field, Tag } from "@/components/Shell";
import { Timeline } from "@/components/Timeline";
import { useCommand } from "@/lib/use-dashboard";
import { dateTime, type Dashboard } from "@/lib/workflows";
import { attendanceCommand } from "@/lib/attendance-actions";
import { hrs } from "@/lib/pay";
import { toast } from "sonner";
export function Attendance({ d }: { d: Dashboard }) {
  const [now, setNow] = useState(0);
  const [token, setToken] = useState("");
  const [scan, setScan] = useState(false);
  const [locStatus, setLocStatus] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const cmd = useCommand();
  const shifts = (d.shifts ?? []).filter((s) => s.worker_id === d.profile.id);
  const active = shifts.find((s) => s.check_in && !s.check_out);
  const current =
    active ??
    shifts
      .filter((s) => !s.check_in && Date.parse(s.scheduled_end) > now)
      .sort((a, b) => Date.parse(a.scheduled_start) - Date.parse(b.scheduled_start))[0] ??
    shifts[0];
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const scanned = new URLSearchParams(window.location.search).get("token");
    if (scanned) {
      setToken(scanned);
      toast.success("Site QR scanned. Press Check in to record your time and location.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  useEffect(() => {
    if (!scan) return;
    let stop: () => void = () => {};
    let cancelled = false;
    void import("@zxing/browser")
      .then(async ({ BrowserQRCodeReader }) => {
        const controls = await new BrowserQRCodeReader().decodeFromVideoDevice(
          undefined,
          video.current ?? undefined,
          (result) => {
            if (result) {
              setToken(result.getText());
              setScan(false);
            }
          },
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      })
      .catch(() => {
        toast.error("Camera unavailable. Paste the site QR code instead.");
        setScan(false);
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [scan]);
  return (
    <div>
      <Panel title="Smart Shift · today">
        <p className="text-sm text-muted-foreground">
          {d.site?.name} · All times in India Standard Time
        </p>
        {current ? (
          <>
            <p className="mt-2">
              {dateTime(current.scheduled_start)} → {dateTime(current.scheduled_end)}
            </p>
            <Timeline
              stages={["Scheduled", "Checked in", "Checked out", "Verified"]}
              current={current.verified_at ? 3 : current.check_out ? 2 : current.check_in ? 1 : 0}
            />
            <p className="mb-3" aria-live="polite">
              {active?.check_in
                ? `On shift · ${hrs(Math.max(0, Math.floor((now - Date.parse(active.check_in)) / 60000)))}`
                : current.check_out
                  ? "Shift complete"
                  : "Not checked in"}
            </p>
            {!current.check_out && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" type="button" onClick={() => setScan(!scan)}>
                    {scan ? <Square /> : <Camera />}
                    {scan ? "Stop camera" : "Scan site QR"}
                  </Button>
                </div>
                {scan && (
                  <video
                    ref={video}
                    className="my-3 aspect-video w-full max-w-sm rounded border"
                    muted
                    playsInline
                  />
                )}
                <form
                  className="mt-3 flex flex-wrap gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const command = await attendanceCommand(
                        current.id,
                        Boolean(active),
                        token,
                        Boolean(d.site?.location_required),
                        setLocStatus,
                      );
                      await cmd.mutateAsync(command);
                      setToken("");
                      toast.success(active ? "Checked out" : "Checked in");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Location access failed. Allow location at the site or request an attendance correction.",
                      );
                    }
                  }}
                >
                  <label className="min-w-0 flex-1 text-sm">
                    Site QR code
                    <input
                      className={field}
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="fairshift:…"
                    />
                  </label>
                  <Button className="self-end" disabled={cmd.isPending}>
                    {active ? "Check out" : "Check in"}
                  </Button>
                </form>
                {locStatus && (
                  <p className="mt-2 text-xs" role="status">
                    {locStatus}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.site?.location_required
                    ? `Site location required within ${d.site.radius_m} m. Pressing check-in/out requests a one-time location reading. No continuous tracking; only verification and distance are saved.`
                    : "Site location verification is not enabled. Your manager can enable it."}
                </p>
              </>
            )}
          </>
        ) : (
          <p className="mt-4 text-muted-foreground">
            No scheduled shifts. Your manager can schedule your next shift.
          </p>
        )}
      </Panel>
      <Panel title="Attendance history" className="mt-4">
        <div className="space-y-5">
          {shifts.map((s) => (
            <div key={s.id} className="border-b pb-4">
              <p className="font-medium">{dateTime(s.scheduled_start)}</p>
              <p className="text-sm">
                In: {s.check_in ? dateTime(s.check_in) : "Missed / not recorded"} · Out:{" "}
                {s.check_out ? dateTime(s.check_out) : "—"}
              </p>
              <Timeline
                stages={["Scheduled", "Checked in", "Checked out", "Verified"]}
                current={s.verified_at ? 3 : s.check_out ? 2 : s.check_in ? 1 : 0}
              />
              {Date.parse(s.scheduled_start) < now && <Correction id={s.id} />}{" "}
              {(d.corrections ?? [])
                .filter((c) => c.shift_id === s.id)
                .map((c) => (
                  <p key={c.id} className="mt-2 text-sm">
                    <Tag>{c.status}</Tag> {c.reason} {c.reply && `· ${c.reply}`}
                  </p>
                ))}
              {(d.events ?? [])
                .filter((ev) => ev.entity_id === s.id)
                .map((ev) => (
                  <p key={ev.id} className="mt-1 text-xs text-muted-foreground">
                    {dateTime(ev.created_at)} · {ev.actor}: {ev.action}
                    {(ev.details as { distance_m?: number } | null)?.distance_m != null && (
                      <span>
                        {" "}
                        · {(ev.details as { distance_m?: number }).distance_m} m from site
                      </span>
                    )}
                    {ev.action.startsWith("Correction ") && (
                      <span> · Before / after: {JSON.stringify(ev.details)}</span>
                    )}
                  </p>
                ))}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
function Correction({ id }: { id: string }) {
  const cmd = useCommand();
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-accent">
        Request missed check-in / hours correction
      </summary>
      <form
        className="mt-3 grid gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const start = new Date(`${f.get("in")}:00+05:30`);
          const end = new Date(`${f.get("out")}:00+05:30`);
          if (end <= start) {
            toast.error("Check-out must be later than check-in");
            return;
          }
          cmd.mutate(
            {
              action: "correction",
              data: {
                id,
                in: start.toISOString(),
                out: end.toISOString(),
                reason: String(f.get("reason")),
              },
            },
            { onSuccess: () => toast.success("Correction requested") },
          );
        }}
      >
        <label>
          Correct check-in (IST)
          <input className={field} name="in" type="datetime-local" required />
        </label>
        <label>
          Correct check-out (IST)
          <input className={field} name="out" type="datetime-local" required />
        </label>
        <label>
          Reason
          <textarea className={field} name="reason" minLength={10} maxLength={500} required />
        </label>
        <Button disabled={cmd.isPending}>Send correction</Button>
      </form>
    </details>
  );
}
