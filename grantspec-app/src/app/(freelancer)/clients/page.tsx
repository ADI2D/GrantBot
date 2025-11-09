export default function FreelancerClientsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-blue-600">Freelancer workspace</p>
        <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-600">
          Manage your nonprofit clients, track proposals, and monitor activity from one place. We&apos;ll
          wire up the dashboard next.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Client dashboard coming soon</h2>
        <p className="mt-2 text-sm text-slate-500">
          This page will list all connected organizations, their active proposals, and quick actions.
          We&apos;ll build it in the next milestone.
        </p>
      </div>
    </div>
  );
}
