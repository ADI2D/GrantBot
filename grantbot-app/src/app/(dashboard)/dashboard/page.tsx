"use client";

import { ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useDashboardData, useBillingData } from "@/hooks/use-api";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { QuotaBanner } from "@/components/billing/quota-banner";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData();
  const { data: billing } = useBillingData();

  if (isLoading) return <PageLoader label="Loading dashboard" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load dashboard"} />;

  const { organization, kpis, opportunities, proposals, learning, tasks } = data;

  return (
    <div className="space-y-8">
      {billing && (
        <QuotaBanner
          planName={billing.planName}
          planLimit={billing.planLimit}
          proposalsThisMonth={billing.proposalsThisMonth}
        />
      )}
      <section className="grid gap-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-6 shadow-sm lg:grid-cols-[2fr,1fr]">
        <div>
          <p className="text-sm font-semibold text-blue-600">GrantBot Pulse</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {organization.name}: keep the win-rate momentum.
          </h1>
          <p className="mt-2 text-sm text-slate-600 lg:max-w-2xl">
            {organization.mission ?? "Ship compliant, compelling proposals with AI + concierge review."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="gap-2">
              Launch new draft
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary">Invite reviewer</Button>
            <Button variant="ghost" className="text-blue-600">
              View success playbook
            </Button>
          </div>
        </div>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Onboarding completion
            </p>
            <Badge tone="info">{Math.round(organization.onboardingCompletion * 100)}% done</Badge>
          </div>
          <div className="mt-6 space-y-3">
            {["Org", "Programs", "Docs", "AI prefs"].map((label, index) => (
              <div key={label} className="flex items-center gap-4 text-sm">
                <div className="w-12 text-slate-500">{label}</div>
                <div className="flex-1">
                  <Progress
                    value={Math.min(100, Math.max(0, organization.onboardingCompletion * 100 - index * 10))}
                  />
                </div>
                <span className="w-16 text-right text-xs text-slate-500">
                  {index * 25 < organization.onboardingCompletion * 100 ? "done" : "todo"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((tile) => (
          <Card key={tile.label} className="p-5">
            <p className="text-xs uppercase text-slate-500">{tile.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{tile.value}</p>
            {tile.delta && <p className="text-xs font-medium text-emerald-600">{tile.delta}</p>}
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Matchboard</p>
              <h2 className="text-lg font-semibold text-slate-900">Recommended opportunities</h2>
            </div>
            <Button variant="ghost" className="text-sm text-blue-600">
              View all
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {opportunities.length === 0 && (
              <EmptyState
                title="No opportunities yet"
                description="Import a CSV or add a funder to start building the pipeline."
              />
            )}
            {opportunities.slice(0, 3).map((opportunity) => (
              <div key={opportunity.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{opportunity.name}</p>
                    <p className="text-xs text-slate-500">
                      {opportunity.focusArea ?? "Multi-issue"} • due {formatDate(opportunity.deadline)}
                    </p>
                  </div>
                  <Badge tone="info">{formatPercent(opportunity.alignmentScore)}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <p className="text-slate-700">{formatCurrency(opportunity.amount)}</p>
                  <Badge tone="neutral">{opportunity.status.replaceAll("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Workspace</p>
              <h2 className="text-lg font-semibold text-slate-900">Proposal progress</h2>
            </div>
            <Button variant="ghost" className="text-sm text-blue-600">
              Board report
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {proposals.slice(0, 3).map((proposal) => (
              <div key={proposal.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{proposal.opportunityName}</p>
                    <p className="text-xs text-slate-500">
                      Owner: {proposal.ownerName ?? "Unassigned"} • due {formatDate(proposal.dueDate)}
                    </p>
                  </div>
                  <Badge tone={proposal.status === "in_review" ? "info" : "neutral"}>
                    {proposal.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <div className="mt-3">
                  <Progress value={proposal.progress} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Learning Loop</p>
              <h2 className="text-lg font-semibold text-slate-900">
                Signal-based recommendations
              </h2>
            </div>
            <Button variant="ghost" className="text-sm text-blue-600">
              View library
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {learning.length === 0 && (
              <EmptyState
                title="No learning moments yet"
                description="Submit proposals to unlock win/loss analytics."
              />
            )}
            {learning.map((moment) => (
              <div key={moment.title} className="rounded-2xl border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-900">{moment.title}</p>
                <p className="text-sm text-slate-600">{moment.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-500">Next steps</p>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            {tasks.length === 0 && (
              <EmptyState
                title="No tasks assigned"
                description="GrantBot will surface blockers once proposals are in play."
              />
            )}
            {tasks.map((task) => (
              <div key={task.title} className="flex items-start gap-3">
                {task.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock3 className="mt-0.5 h-4 w-4 text-amber-500" />
                )}
                <div>
                  {task.title}
                  <p className="text-xs text-slate-500">{task.subtext}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
