"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useAnalyticsData } from "@/hooks/use-api";

export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsData();

  if (isLoading) return <PageLoader label="Loading analytics" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load analytics"} />;

  const { funnel, winRateTrend, boardInsights } = data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Outcomes analytics</p>
          <h1 className="text-3xl font-semibold text-slate-900">Learn from every submission.</h1>
          <p className="text-sm text-slate-600">
            Track conversion, funding velocity, and template performance for board-ready reporting.
          </p>
        </div>
        <Button className="gap-2">
          Download board packet
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-500">Pipeline funnel</p>
          <div className="mt-4 space-y-4">
            {funnel.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-900">{stage.label}</p>
                  <span className="text-slate-500">
                    {stage.value}/{stage.target}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, (stage.value / stage.target) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-500">Win rate trend</p>
          <div className="mt-4 h-48">
            {winRateTrend.length === 0 ? (
              <EmptyState title="No win data" description="Submit proposals to unlock the trend line." />
            ) : (
              <div className="flex h-full items-end gap-3">
                {winRateTrend.map((value, index) => (
                  <div key={index} className="flex-1">
                    <div className="rounded-t-2xl bg-blue-500" style={{ height: `${value}%` }} />
                    <p className="mt-2 text-center text-xs text-slate-500">W{index + 1}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Badge tone="success" className="mt-4">
            {winRateTrend.length ? `Current ${winRateTrend.at(-1)}%` : "Awaiting data"}
          </Badge>
        </Card>
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Learning loop</p>
            <h2 className="text-lg font-semibold text-slate-900">
              Key insights powering GrantBot prompts
            </h2>
          </div>
          <Button variant="secondary">Share with board</Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {boardInsights.length === 0 && (
            <EmptyState
              title="No insights recorded"
              description="Log submission outcomes to capture feedback."
              className="md:col-span-3"
            />
          )}
          {boardInsights.map((insight) => (
            <div key={insight.title} className="rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
              <p className="mt-2 text-xs text-slate-500">{insight.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
