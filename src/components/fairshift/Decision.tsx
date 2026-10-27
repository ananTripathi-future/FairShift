import { useState } from "react";
import { Button } from "@/components/ui/button";
import { field } from "@/components/Shell";
import { useCommand } from "@/lib/use-dashboard";
export function Decision({
  id,
  kind,
}: {
  id: string;
  kind: "correction_decision" | "dispute_decision";
}) {
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
