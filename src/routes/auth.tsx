import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { field } from "@/components/Shell";
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" && r.startsWith("/") ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — FairShift" },
      { name: "description", content: "Secure access to your FairShift account." },
      { property: "og:title", content: "Sign in — FairShift" },
      { property: "og:description", content: "Private shifts, pay and safety reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});
function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const destination = redirectTo?.startsWith("/") ? redirectTo : "/worker";
  const social = async (provider: "google" | "lovable") => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: "/worker" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold">FairShift</h1>
      <p className="mb-8 mt-2 text-muted-foreground">
        {mode === "signup"
          ? "Create your worker account"
          : mode === "forgot"
            ? "Reset your password"
            : "Sign in to your workspace"}
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email"));
          try {
            if (mode === "forgot") {
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) throw error;
              setMessage("Check your email for a password reset link.");
            } else if (mode === "signup") {
              const { error } = await supabase.auth.signUp({
                email,
                password: String(f.get("password")),
                options: {
                  emailRedirectTo: window.location.origin,
                  data: { name: String(f.get("name")) },
                },
              });
              if (error) throw error;
              setMessage("Check your email to confirm your account before signing in.");
            } else {
              const { error } = await supabase.auth.signInWithPassword({
                email,
                password: String(f.get("password")),
              });
              if (error) throw error;
              await navigate({ to: destination });
            }
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Sign in failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "signup" && (
          <label className="block text-sm">
            Your name
            <input
              name="name"
              required
              minLength={1}
              maxLength={100}
              autoComplete="name"
              className={field}
            />
          </label>
        )}
        <label className="block text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        {mode !== "forgot" && (
          <label className="block text-sm">
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              className={field}
            />
          </label>
        )}
        <Button className="w-full" disabled={busy}>
          {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </Button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </form>
      <div className="my-5 flex flex-wrap gap-2">
        <Button
          variant="link"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setMessage("");
          }}
        >
          {mode === "signup" ? "Already have an account?" : "Create account"}
        </Button>
        <Button variant="link" onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}>
          {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
        </Button>
      </div>
      <div className="space-y-3">
        <Button
          className="w-full"
          variant="outline"
          disabled={busy}
          onClick={() => social("google")}
        >
          Continue with Google
        </Button>
        <Button
          className="lovable-auth-button w-full"
          disabled={busy}
          onClick={() => social("lovable")}
        >
          Continue with Lovable
        </Button>
      </div>
    </main>
  );
}
