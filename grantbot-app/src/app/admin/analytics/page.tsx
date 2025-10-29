import { fetchAdminAnalytics, formatRevenueTrendValue } from "@/lib/admin-analytics";
import { formatCurrency } from "@/lib/format";

export default async function AdminAnalyticsPage() {
  const analytics = await fetchAdminAnalytics();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase text-slate-500">Insights</p>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">
          Monitor growth, retention, and outcomes across every GrantBot organization.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <AnalyticsCard label="Active organizations" value={analytics.activeOrganizations.toString()} hint="Across all workspaces" />
        <AnalyticsCard label="Seats provisioned" value={analytics.activeMembers.toString()} hint="Total users with access" />
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Revenue trend</h2>
          <p className="text-sm text-slate-500">Collected MRR over the last six months.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {analytics.revenueTrend.map((point) => (
              <div key={point.month} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">{point.month}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatRevenueTrendValue(point.total, analytics.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Operations highlights</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
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
              Active organizations total {analytics.activeOrganizations}. Keep an eye on onboarding completion for recent signups.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">AI cost monitoring</h2>
        <p className="text-sm text-slate-500">
          Alerts will trigger when monthly AI spend crosses $500 / $1000 / $2000 thresholds as outlined in the PRD.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Budget guardrail</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">$500</p>
            <p className="text-xs text-slate-500">Slack alert to #ai-ops</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Optimization needed</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">$1,000</p>
            <p className="text-xs text-slate-500">Auto-create support ticket</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Executive alert</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">$2,000</p>
            <p className="text-xs text-slate-500">Email founders weekly report</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalyticsCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{hint}</p>
    </div>
  );
}
