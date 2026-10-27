import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shell, field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
export function Onboarding() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const cmd = useCommand();
  return (
    <Shell title="Welcome to FairShift">
      <div className="grid gap-8 md:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            cmd.mutate({ action: "join_site", data: { code } });
          }}
        >
          <h2 className="text-lg font-medium">Join your work site</h2>
          <label className="block">
            Site invitation code
            <input
              required
              className={field}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <Button disabled={cmd.isPending}>Join as worker</Button>
        </form>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            cmd.mutate({ action: "create_site", data: { name } });
          }}
        >
          <h2 className="text-lg font-medium">Set up a site</h2>
          <label className="block">
            Site name
            <input
              required
              minLength={2}
              maxLength={100}
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            You will be this site's manager. Invite workers and appoint supervisors after creating
            it.
          </p>
          <Button variant="outline" disabled={cmd.isPending}>
            Create site
          </Button>
        </form>
      </div>
    </Shell>
  );
}
