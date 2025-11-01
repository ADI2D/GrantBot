import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function AdminDashboardPage() {
  const supabase = getServiceSupabaseClient();

  const [orgCountResult, memberCountResult, proposalCountResult, latestInvoicesResult, auditLogsResult] =
    await Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("org_members").select("id", { count: "exact", head: true }),
      supabase.from("proposals").select("id", { count: "exact", head: true }),
      supabase
        .from("billing_payments")
        .select("stripe_invoice_id, amount, currency, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("admin_audit_logs")
        .select("action, target_type, target_id, created_at, actor_role")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const orgCount = orgCountResult.count ?? 0;
  const memberCount = memberCountResult.count ?? 0;
  const proposalCount = proposalCountResult.count ?? 0;
  const invoices = latestInvoicesResult.data ?? [];
  const auditLogs = auditLogsResult.data ?? [];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Operational overview</h1>
        <p className="text-sm text-slate-500">Key metrics for the GrantBot workspace.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <DashboardCard title="Active organizations" value={orgCount} caption="Total orgs in Supabase" />
          <DashboardCard title="Members" value={memberCount} caption="Total seats across orgs" />
          <DashboardCard title="Proposals" value={proposalCount} caption="Total proposals tracked" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent invoices</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                    No invoices recorded yet.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.stripe_invoice_id}>
                    <td className="py-2 text-slate-700">{invoice.stripe_invoice_id}</td>
                    <td className="py-2 text-slate-700">
                      {formatCurrency(Number(invoice.amount ?? 0), invoice.currency ?? "USD")}
                    </td>
                    <td className="py-2 text-slate-500">{invoice.status ?? "unknown"}</td>
                    <td className="py-2 text-slate-500">
                      {invoice.created_at ? formatDate(invoice.created_at) : "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent admin activity</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {auditLogs.length === 0 ? (
              <li className="text-slate-500">No admin actions recorded yet.</li>
            ) : (
              auditLogs.map((log, index) => (
                <li key={`${log.created_at}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="font-medium text-slate-800">{log.action}</p>
                  <p className="text-xs text-slate-500">
                    {log.actor_role ?? "unknown"} &bull; {log.created_at ? formatDate(log.created_at) : "--"}
                  </p>
                  {log.target_type && (
                    <p className="text-xs text-slate-500">
                      Target: {log.target_type} {log.target_id ?? "--"}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-500">{caption}</p>
    </div>
  );
}
