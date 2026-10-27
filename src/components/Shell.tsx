import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export function Shell({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">
            FairShift
          </Link>
          <nav aria-label="Main" className="flex gap-4 text-sm text-muted-foreground">
            <Link
              to="/worker"
              activeProps={{ className: "text-foreground font-medium", "aria-current": "page" }}
            >
              Worker
            </Link>
            <Link
              to="/manager"
              activeProps={{ className: "text-foreground font-medium", "aria-current": "page" }}
            >
              Manager
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>Private workspace</span>
            {signedIn ? (
              <Button
                variant="link"
                size="sm"
                onClick={async () => {
                  await cache.cancelQueries();
                  cache.clear();
                  await supabase.auth.signOut();
                  setSignedIn(false);
                  await navigate({ to: "/auth", replace: true });
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button asChild variant="link" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {right}
        </div>
        {children}
      </main>
    </div>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 border-t pt-5 ${className}`}>
      {title && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const tone: Record<string, string> = {
  Open: "bg-warning/30",
  Reported: "bg-warning/30",
  "Action Taken": "bg-accent/15 text-accent",
  Overdue: "bg-destructive/10 text-destructive",
  Escalated: "bg-destructive/10 text-destructive",
  Submitted: "bg-warning/30",
  "Under Review": "bg-secondary",
  "In Progress": "bg-secondary",
  Resolved: "bg-accent/15 text-accent",
  Approved: "bg-accent/15 text-accent",
  Rejected: "bg-destructive/10 text-destructive",
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning/30",
  Low: "bg-secondary",
  Estimate: "bg-secondary",
};
export function Tag({ children }: { children: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tone[children] ?? "bg-secondary"}`}
    >
      {children}
    </span>
  );
}

export const field =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
