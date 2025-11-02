import { Card } from "@/components/ui/card";
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
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Executive view</p>
        <h1 className="text-3xl font-semibold text-primary">Operational overview</h1>
        <p className="text-sm text-muted">Key metrics for the GrantBot workspace.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <DashboardCard title="Active organizations" value={orgCount} caption="Total orgs in Supabase" />
          <DashboardCard title="Members" value={memberCount} caption="Total seats across orgs" />
          <DashboardCard title="Proposals" value={proposalCount} caption="Total proposals tracked" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary">Recent invoices</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 text-left font-semibold text-secondary">Invoice</th>
                <th className="py-2 text-left font-semibold text-secondary">Amount</th>
                <th className="py-2 text-left font-semibold text-secondary">Status</th>
                <th className="py-2 text-left font-semibold text-secondary">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted">
                    No invoices recorded yet.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.stripe_invoice_id} className="hover:bg-[color:var(--color-surface-muted)]">
                    <td className="py-2 text-primary">{invoice.stripe_invoice_id}</td>
                    <td className="py-2 text-primary">
                      {formatCurrency(Number(invoice.amount ?? 0), invoice.currency ?? "USD")}
                    </td>
                    <td className="py-2 text-muted">{invoice.status ?? "unknown"}</td>
                    <td className="py-2 text-muted">{invoice.created_at ? formatDate(invoice.created_at) : "--"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary">Recent admin activity</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            {auditLogs.length === 0 ? (
              <li className="text-muted">No admin actions recorded yet.</li>
            ) : (
              auditLogs.map((log, index) => (
                <Card
                  key={`${log.created_at}-${index}`}
                  className="border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-2 shadow-none"
                >
                  <p className="font-medium text-primary">{log.action}</p>
                  <p className="text-xs text-muted">
                    {log.actor_role ?? "unknown"} • {log.created_at ? formatDate(log.created_at) : "--"}
                  </p>
                  {log.target_type && (
                    <p className="text-xs text-muted">
                      Target: {log.target_type} {log.target_id ?? "--"}
                    </p>
                  )}
                </Card>
              ))
            )}
          </ul>
        </Card>
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
    <Card className="p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted/80">{title}</p>
      <p className="mt-4 text-3xl font-semibold text-primary">{value.toLocaleString()}</p>
      <p className="text-sm text-muted">{caption}</p>
    </Card>
  );
}
