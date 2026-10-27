import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Onboarding } from "@/components/fairshift/Onboarding";
import { Attendance } from "@/components/fairshift/Attendance";
import { FairPay } from "@/components/fairshift/FairPay";
import { SafeVoice, Reports } from "@/components/fairshift/SafeVoice";
import { useDashboard } from "@/lib/use-dashboard";
import { Skills } from "@/components/fairshift/Skills";
import { Notes, WorkerProfile } from "@/components/fairshift/RoleTools";
export const Route = createFileRoute("/_authenticated/worker")({
  head: () => ({
    meta: [
      { title: "My shifts, FairPay & SafeVoice — FairShift" },
      {
        name: "description",
        content: "Private attendance, transparent earnings and safety reporting.",
      },
      { property: "og:title", content: "Worker workspace — FairShift" },
      { property: "og:description", content: "Your shifts, pay and safety updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Worker,
});
function Worker() {
  const q = useDashboard();
  if (q.isPending)
    return (
      <Shell title="Loading your workspace…">
        <p role="status">Please wait.</p>
      </Shell>
    );
  if (q.error || !q.data)
    return (
      <Shell title="Workspace unavailable">
        <p role="alert">{q.error?.message}</p>
      </Shell>
    );
  const d = q.data;
  if (!d.membership) return <Onboarding />;
  return (
    <Shell title={`Hello, ${d.profile.name}`}>
      <div className="mb-5 space-y-2">
        {d.notifications?.map((n) => (
          <p key={n.id} className="border-l-4 border-accent bg-secondary p-3 text-sm">
            {n.message}
          </p>
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Attendance d={d} />
        <FairPay d={d} />
        <SafeVoice d={d} />
        <Reports d={d} />
        <Skills d={d} />
        <WorkerProfile d={d} />
        <Notes d={d} />
      </div>
    </Shell>
  );
}
