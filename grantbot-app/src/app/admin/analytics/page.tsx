import { Card } from "@/components/ui/card";
import { fetchAdminAnalytics, formatRevenueTrendValue } from "@/lib/admin-analytics";
import { formatCurrency } from "@/lib/format";

export default async function AdminAnalyticsPage() {
  const analytics = await fetchAdminAnalytics();

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Insights</p>
        <h1 className="text-3xl font-semibold text-primary">Analytics</h1>
        <p className="text-sm text-muted">
          Monitor growth, retention, and outcomes across every GrantBot organization.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <AnalyticsCard
          label="Active organizations"
          value={analytics.activeOrganizations.toString()}
          hint="Across all workspaces"
        />
        <AnalyticsCard
          label="Seats provisioned"
          value={analytics.activeMembers.toString()}
          hint="Total users with access"
        />
        <AnalyticsCard
          label="Proposals this month"
          value={analytics.proposalsThisMonth.toString()}
          hint={`${analytics.winsThisMonth} funded (${analytics.winRateThisMonth}% win rate)`}
        />
        <AnalyticsCard
          label="MRR trend"
          value={formatCurrency(analytics.revenueTrend.at(-1)?.total ?? 0, analytics.currency)}
          hint="Latest month of collected revenue"
        />
        <AnalyticsCard
          label="AI cost this month"
          value={formatCurrency(analytics.aiCostThisMonth, analytics.currency)}
          hint={
            analytics.aiCostPerProposal !== null
              ? `$${analytics.aiCostPerProposal.toFixed(2)} per proposal`
              : "No proposals yet"
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary">Revenue trend</h2>
          <p className="text-sm text-muted">Collected MRR over the last six months.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {analytics.revenueTrend.map((point) => (
              <Card
                key={point.month}
                className="border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4 shadow-none"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-muted/80">{point.month}</p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {formatRevenueTrendValue(point.total, analytics.currency)}
                </p>
              </Card>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary">Operations highlights</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li>
              {analytics.proposalsThisMonth > 0
                ? `${analytics.proposalsThisMonth} proposals submitted this month.`
                : "No proposals submitted yet this month."}
            </li>
            <li>
              {analytics.winsThisMonth > 0
                ? `${analytics.winsThisMonth} awards recorded — ${analytics.winRateThisMonth}% win rate.`
                : "Waiting on new award outcomes."}
            </li>
            <li>
              Active organizations total {analytics.activeOrganizations}. Keep an eye on onboarding completion for recent
              signups.
            </li>
          </ul>
        </Card>
      </section>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-primary">AI cost monitoring</h2>
        <p className="text-sm text-muted">
          Alerts will trigger when monthly AI spend crosses $500 / $1000 / $2000 thresholds as outlined in the PRD.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card className="border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4 shadow-none">
            <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Budget guardrail</p>
            <p className="mt-2 text-lg font-semibold text-primary">$500</p>
            <p className="text-xs text-muted">Slack alert to #ai-ops</p>
          </Card>
          <Card className="border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4 shadow-none">
            <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Optimization needed</p>
            <p className="mt-2 text-lg font-semibold text-primary">$1,000</p>
            <p className="text-xs text-muted">Auto-create support ticket</p>
          </Card>
          <Card className="border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4 shadow-none">
            <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Executive alert</p>
            <p className="mt-2 text-lg font-semibold text-primary">$2,000</p>
            <p className="text-xs text-muted">Email founders weekly report</p>
          </Card>
        </div>
      </Card>
    </div>
  );
}

function AnalyticsCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted/80">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-primary">{value}</p>
      <p className="text-sm text-muted">{hint}</p>
    </Card>
  );
}
