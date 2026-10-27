import { Button } from "@/components/ui/button";
import { Panel, field, Tag } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
import type { Dashboard } from "@/lib/workflows";
import { toast } from "sonner";
export function Skills({ d }: { d: Dashboard }) {
  const cmd = useCommand();
  return (
    <Panel title="My skills record">
      <div className="mb-4 flex flex-wrap gap-2">
        {d.profile.skills.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("skills"));
          await cmd.mutateAsync({
            action: "skills",
            data: {
              skills: value
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            },
          });
          toast.success("Skills saved");
        }}
      >
        <label className="block text-sm">
          Skills and qualifications
          <textarea
            className={field}
            rows={4}
            name="skills"
            defaultValue={d.profile.skills.join("\n")}
            maxLength={2020}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          One skill per line · up to 20 entries. Self-recorded, not certified by FairShift.
        </p>
        <Button disabled={cmd.isPending}>Save skills</Button>
      </form>
    </Panel>
  );
}
