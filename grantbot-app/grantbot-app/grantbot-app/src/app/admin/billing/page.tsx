import Link from "next/link";
import { fetchBillingOverview, formatAmount } from "@/lib/admin-billing";
import { formatDate } from "@/lib/format";

const STATUS_BADGES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  open: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  past_due: "bg-rose-100 text-rose-700",
  uncollectible: "bg-rose-100 text-rose-700",
  void: "bg-slate-200 text-slate-500",
};

export default async function AdminBillingPage() {
  const overview = await fetchBillingOverview();
  const currency = overview.invoices[0]?.currency ?? "USD";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase text-slate-500">Revenue controls</p>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500">
          Manage plans, Stripe sync status, and manual adjustments for GrantBot customers.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <MetricCard
          label="MRR (current month)"
          value={formatAmount(overview.mrrThisMonth, currency)}
          hint={`Last month ${formatAmount(overview.mrrLastMonth, currency)}`}
        />
        <MetricCard label="MRR growth" value={`${overview.mrrGrowthPercent}%`} hint="vs previous month" />
        <MetricCard
          label="Total paid YTD"
          value={formatAmount(overview.totalPaidYtd, currency)}
          hint="All successful invoices"
        />
        <MetricCard
          label="Open invoices"
          value={overview.openInvoiceCount.toString()}
          hint={`${overview.delinquentInvoiceCount} delinquent`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent invoices</h2>
              <p className="text-sm text-slate-500">Last 15 invoices synced from Stripe.</p>
            </div>
            <Link
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Open Stripe
            </Link>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Invoice</th>
                  <th className="px-4 py-3 text-left font-medium">Organization</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Due</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {overview.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No invoices synced yet.
                    </td>
                  </tr>
                ) : (
                  overview.invoices.map((invoice) => {
                    const status = invoice.status?.toLowerCase() ?? "unknown";
                    const badgeTone = STATUS_BADGES[status] ?? "bg-slate-200 text-slate-600";
                    const org = overview.customerSummaries.find((summary) => summary.id === invoice.organizationId);
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{invoice.stripeInvoiceId}</td>
                        <td className="px-4 py-3 text-slate-500">{org?.name ?? "Unknown org"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeTone}`}>
                            {status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-800">
                          {formatAmount(Number(invoice.amount ?? 0), invoice.currency ?? currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(invoice.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Manual actions</h3>
            <p className="mt-2 text-sm text-slate-500">
              Use the API endpoints to perform billing overrides while audit trails capture each change.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>
                <strong>Issue refund</strong> – POST <code>/api/admin/billing/refund</code> with{" "}
                <code>{"{ stripeInvoiceId, amount }"}</code>
              </li>
              <li>
                <strong>Apply credit</strong> – POST <code>/api/admin/billing/credit</code> with{" "}
                <code>{"{ organizationId, amount, reason }"}</code>
              </li>
              <li>
                <strong>Extend trial</strong> – POST <code>/api/admin/billing/trial</code> with{" "}
                <code>{"{ organizationId, days }"}</code>
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              All endpoints require super-admin privileges and log entries to <code>admin_audit_logs</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Alerts</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                {overview.delinquentInvoiceCount > 0 ? (
                  <>
                    <strong>{overview.delinquentInvoiceCount}</strong> invoices delinquent. Follow up with customers and
                    capture notes.
                  </>
                ) : (
                  "No delinquent invoices. 🎉"
                )}
              </li>
              <li>
                {overview.openInvoiceCount > 0
                  ? "Monitor open invoices to ensure payment methods are up to date."
                  : "All invoices are settled."}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{hint}</p>
    </div>
  );
}
