export default function FreelancerTimeTrackingPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-blue-600">Freelancer workspace</p>
        <h1 className="text-2xl font-semibold text-slate-900">Time tracking &amp; invoices</h1>
        <p className="mt-2 text-sm text-slate-600">
          A dedicated view for logging billable hours and generating invoices will live here. We&apos;ll
          wire it up after the client dashboard.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Coming soon</h2>
        <p className="mt-2 text-sm text-slate-500">
          Track your work, convert sessions into invoices, and keep clients up to date once this module
          is built.
        </p>
      </div>
    </div>
  );
}
