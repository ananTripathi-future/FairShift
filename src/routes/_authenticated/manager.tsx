import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Onboarding } from "@/components/fairshift/Onboarding";
import { ManagerWorkspace } from "@/components/fairshift/ManagerWorkspace";
import { useDashboard } from "@/lib/use-dashboard";
export const Route = createFileRoute("/_authenticated/manager")({
  head: () => ({
    meta: [
      { title: "Site manager & escalation — FairShift" },
      {
        name: "description",
        content: "Manage verified shifts, transparent payroll and confidential safety cases.",
      },
      { property: "og:title", content: "Site oversight — FairShift" },
      { property: "og:description", content: "Accountable manager and supervisor actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Manager,
});
function Manager() {
  const q = useDashboard();
  if (q.isPending)
    return (
      <Shell title="Loading site…">
        <p role="status">Please wait.</p>
      </Shell>
    );
  if (q.error || !q.data)
    return (
      <Shell title="Site unavailable">
        <p role="alert">{q.error?.message}</p>
      </Shell>
    );
  if (!q.data.membership) return <Onboarding />;
  if (q.data.membership.role === "worker")
    return (
      <Shell title="Manager access required">
        <p>Your site manager must authorise supervisor or manager access for this site.</p>
      </Shell>
    );
  return <ManagerWorkspace d={q.data} />;
}
