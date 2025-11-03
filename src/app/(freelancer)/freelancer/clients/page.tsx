import { listFreelancerClients } from "@/lib/freelancer-clients";
import { ClientGrid } from "@/components/freelancer/client-grid";

export default async function FreelancerClientsPage() {
  const clients = await listFreelancerClients();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-blue-600">Freelancer workspace</p>
        <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-600">
          Manage your nonprofit clients, track proposals, and monitor activity from one place. This view will
          connect to Supabase once the freelancer tables land.
        </p>
      </header>

      <ClientGrid clients={clients} />
    </div>
  );
}
