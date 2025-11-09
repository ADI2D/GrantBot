import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBillingOverview, formatAmount } from "@/lib/admin-billing";
import { formatDate } from "@/lib/format";
import { ManualBillingActions } from "./manual-actions";

const STATUS_TONES: Record<string, "success" | "warning" | "neutral" | "info"> = {
  paid: "success",
  succeeded: "success",
  open: "warning",
  draft: "neutral",
  past_due: "warning",
  uncollectible: "warning",
  void: "neutral",
};

export default async function AdminBillingPage() {
  const overview = await fetchBillingOverview();
  const currency = overview.invoices[0]?.currency ?? "USD";

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Revenue controls</p>
        <h1 className="text-3xl font-semibold text-primary">Billing</h1>
        <p className="text-sm text-muted">
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
        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-primary">Recent invoices</h2>
              <p className="text-sm text-muted">Last 15 invoices synced from Stripe.</p>
            </div>
            <Button variant="secondary" asChild>
              <Link href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
                Open Stripe
              </Link>
            </Button>
          </div>
          <div className="mt-6 overflow-hidden rounded-[var(--radius-soft)] border border-[color:var(--color-border)]">
            <table className="min-w-full divide-y divide-[color:var(--color-border)] text-sm">
              <thead className="bg-[color:var(--color-surface-muted)] text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Organization</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-secondary">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Due</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)] bg-[color:var(--color-surface)] text-muted">
                {overview.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                      No invoices synced yet.
                    </td>
                  </tr>
                ) : (
                  overview.invoices.map((invoice) => {
                    const status = invoice.status?.toLowerCase() ?? "unknown";
                    const badgeTone = STATUS_TONES[status] ?? "neutral";
                    const org = overview.customerSummaries.find((summary) => summary.id === invoice.organizationId);
                    return (
                      <tr key={invoice.id} className="hover:bg-[color:var(--color-surface-muted)]">
                        <td className="px-4 py-3 font-semibold text-primary">{invoice.stripeInvoiceId}</td>
                        <td className="px-4 py-3 text-muted">{org?.name ?? "Unknown org"}</td>
                        <td className="px-4 py-3">
                          <Badge tone={badgeTone} className="capitalize">
                            {status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-primary">
                          {formatAmount(Number(invoice.amount ?? 0), invoice.currency ?? currency)}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-muted">{formatDate(invoice.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <ManualBillingActions />

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary">Alerts</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
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
          </Card>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted/80">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-primary">{value}</p>
      <p className="text-sm text-muted">{hint}</p>
    </Card>
  );
}
