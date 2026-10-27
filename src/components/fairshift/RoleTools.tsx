import { Button } from "@/components/ui/button";
import { Panel, field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
import { dateTime, type Dashboard } from "@/lib/workflows";

export function WorkerProfile({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  return (
    <Panel title="My profile">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          cmd.mutate({
            action: "profile",
            data: {
              name: String(f.get("name")),
              language: f.get("language") === "ta" ? "ta" : "en",
            },
          });
        }}
      >
        <label className="block text-sm">
          Name
          <input
            name="name"
            className={field}
            defaultValue={d.profile.name}
            required
            maxLength={100}
          />
        </label>
        <label className="block text-sm">
          Preferred language
          <select name="language" className={field} defaultValue={d.profile.language}>
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </select>
        </label>
        <Button disabled={cmd.isPending}>Save profile</Button>
      </form>
    </Panel>
  );
}
export function Notes({ d, staff = false }: { d: Dashboard; staff?: boolean }) {
  const cmd = useCommand();
  const action = staff ? "observation" : "feedback";
  const event = staff ? "Site observation" : "Worker feedback";
  return (
    <Panel title={staff ? "Site observations" : "My feedback"}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          await cmd.mutateAsync({ action, data: { text: String(new FormData(form).get("text")) } });
          form.reset();
        }}
      >
        <label className="block text-sm">
          {staff ? "Operational update" : "Feedback"}
          <textarea name="text" className={field} required minLength={10} maxLength={500} />
        </label>
        <Button disabled={cmd.isPending}>{staff ? "Record observation" : "Submit feedback"}</Button>
      </form>
      <ul className="mt-4 space-y-3">
        {d.events
          ?.filter((e) => e.action === event)
          .map((e) => (
            <li key={e.id} className="border-t pt-2 text-sm">
              {String((e.details as Record<string, unknown>)?.["text"] ?? "")}
              <p className="text-xs text-muted-foreground">
                {dateTime(e.created_at)} · {e.actor}
              </p>
            </li>
          ))}
      </ul>
    </Panel>
  );
}
export function OvertimeRules({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  return (
    <Panel title="Site overtime rules">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          cmd.mutate({
            action: "pay_rules",
            data: { minutes: Number(f.get("minutes")), multiplier: Number(f.get("multiplier")) },
          });
        }}
      >
        <label className="block text-sm">
          Regular minutes per IST day
          <input
            name="minutes"
            className={field}
            type="number"
            min={60}
            max={1440}
            defaultValue={d.site?.daily_regular_minutes ?? 480}
            required
          />
        </label>
        <label className="block text-sm">
          Overtime rate (% of hourly pay)
          <input
            name="multiplier"
            className={field}
            type="number"
            min={100}
            max={300}
            defaultValue={d.site?.overtime_multiplier_pct ?? 150}
            required
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Saving recalculates this site's estimates and clears payroll approvals. These are site
          rules, not legal advice.
        </p>
        <Button disabled={cmd.isPending}>Save overtime rules</Button>
      </form>
    </Panel>
  );
}
export function ShiftTools({
  shift,
  self,
}: {
  shift: NonNullable<Dashboard["shifts"]>[number];
  self: boolean;
}) {
  const cmd = useCommand();
  const future = !shift.check_in && Date.parse(shift.scheduled_start) > Date.now();
  // Staff may move or cancel any shift the worker has not checked into, including a missed start.
  const editable = !shift.check_in;
  return (
    <div className="mt-2 space-y-2">
      {!future && (!shift.check_in || !shift.check_out) && !self && (
        <details>
          <summary className="cursor-pointer text-xs">Flag missing attendance</summary>
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              cmd.mutate({
                action: "flag_attendance",
                data: { id: shift.id, reason: String(new FormData(e.currentTarget).get("reason")) },
              });
            }}
          >
            <label className="block text-xs">
              Attendance concern
              <input name="reason" className={field} minLength={10} maxLength={500} required />
            </label>
            <Button size="sm" disabled={cmd.isPending}>
              Request worker review
            </Button>
          </form>
        </details>
      )}
      {editable && (
        <details>
          <summary className="cursor-pointer text-xs">Reschedule</summary>
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              cmd.mutate({
                action: "update_shift",
                data: {
                  id: shift.id,
                  start: new Date(`${f.get("start")}:00+05:30`).toISOString(),
                  end: new Date(`${f.get("end")}:00+05:30`).toISOString(),
                },
              });
            }}
          >
            <label className="block text-xs">
              New start (IST)
              <input name="start" className={field} type="datetime-local" required />
            </label>
            <label className="block text-xs">
              New end (IST)
              <input name="end" className={field} type="datetime-local" required />
            </label>
            <Button size="sm" disabled={cmd.isPending}>
              Save shift times
            </Button>
          </form>
        </details>
      )}
      {editable && (
        <details>
          <summary className="cursor-pointer text-xs">Cancel shift</summary>
          <form
            className="mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                confirm("Cancel this shift? The worker will be notified and it cannot be undone.")
              ) {
                cmd.mutate({ action: "cancel_shift", data: { id: shift.id } });
              }
            }}
          >
            <Button size="sm" variant="outline" disabled={cmd.isPending}>
              Confirm cancellation
            </Button>
          </form>
        </details>
      )}
    </div>
  );
}
