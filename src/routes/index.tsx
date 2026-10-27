import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "FairShift — clear hours, fair pay, safer sites" },
      {
        name: "description",
        content:
          "Workers see their hours, pay breakdown and raise safety issues. Managers respond and keep an audit trail.",
      },
      { property: "og:title", content: "FairShift — clear hours, fair pay, safer sites" },
      {
        property: "og:description",
        content:
          "Attendance, transparent payslips and safety reporting for construction and campus workers.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold">FairShift</h1>
      <p className="mt-3 text-lg text-muted-foreground">Clear hours. Fair pay. Safer work.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Link to="/worker" className="border-t-4 border-accent py-5">
          <h2 className="text-xl font-medium">Worker workspace →</h2>
          <p className="mt-2 text-muted-foreground">
            My shifts, earnings and confidential safety reports.
          </p>
        </Link>
        <Link to="/manager" className="border-t-4 border-primary py-5">
          <h2 className="text-xl font-medium">Site oversight →</h2>
          <p className="mt-2 text-muted-foreground">
            Attendance, payroll and accountable safety action.
          </p>
        </Link>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Real accounts · private records · site-based access
      </p>
      <Link to="/auth" className="mt-4 inline-block text-sm text-accent underline">
        Sign in or create your account
      </Link>
    </main>
  );
}
