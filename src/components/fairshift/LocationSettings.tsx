import { Button } from "@/components/ui/button";
import { Panel, field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
import type { Dashboard } from "@/lib/workflows";
import { toast } from "sonner";
export function LocationSettings({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  return (
    <Panel title="Worksite location check">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await cmd.mutateAsync({
            action: "location_settings",
            data: {
              required: f.get("required") === "on",
              latitude: Number(f.get("latitude")),
              longitude: Number(f.get("longitude")),
              radius: Number(f.get("radius")),
            },
          });
          toast.success("Site location settings saved");
        }}
      >
        <label className="flex gap-2 text-sm">
          <input name="required" type="checkbox" defaultChecked={d.site?.location_required} />
          Require location at check-in and check-out
        </label>
        <label className="block text-sm">
          Worksite latitude
          <input
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            required
            className={field}
            defaultValue={d.site?.latitude ?? undefined}
          />
        </label>
        <label className="block text-sm">
          Worksite longitude
          <input
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            required
            className={field}
            defaultValue={d.site?.longitude ?? undefined}
          />
        </label>
        <label className="block text-sm">
          Allowed radius (metres)
          <input
            name="radius"
            type="number"
            min={50}
            max={2000}
            required
            className={field}
            defaultValue={d.site?.radius_m ?? 150}
          />
        </label>
        <Button disabled={cmd.isPending}>Save location settings</Button>
        <p className="text-xs text-muted-foreground">
          Location is requested only at attendance actions, with permission. GPS can be inaccurate
          or spoofed; this reduces misuse, not guarantees it. Workers unable to share location can
          request a reviewed correction.
        </p>
      </form>
    </Panel>
  );
}
