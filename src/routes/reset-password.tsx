import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { field } from "@/components/Shell";
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — FairShift" },
      { name: "description", content: "Set a new password for your FairShift account." },
      { property: "og:title", content: "Password recovery — FairShift" },
      { property: "og:description", content: "Secure account recovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});
function Reset() {
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setValid(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  }, []);
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-5 text-2xl font-semibold">Reset your password</h1>
      {valid ? (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            const { error } = await supabase.auth.updateUser({
              password: String(f.get("password")),
            });
            setMessage(error?.message ?? "Password updated. You can return to your workspace.");
            setBusy(false);
          }}
        >
          <label className="block">
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className={field}
            />
          </label>
          <Button disabled={busy}>Update password</Button>
          <p role="status">{message}</p>
        </form>
      ) : (
        <p role="alert">
          Open the password recovery link from your email. You can request another link on the
          sign-in page.
        </p>
      )}
    </main>
  );
}
