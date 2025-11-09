export default function NewFreelancerClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-600">Add client</p>
        <h1 className="text-2xl font-semibold text-slate-900">Onboard a new organization</h1>
        <p className="mt-2 text-sm text-slate-600">
          The onboarding form for EIN lookup, contact details, and engagement notes will be implemented
          here. For now, this placeholder keeps the navigation flow intact.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Client intake form coming soon</h2>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;ll add fields for organization info, contacts, and internal notes in the next pass.
        </p>
      </div>
    </div>
  );
}
