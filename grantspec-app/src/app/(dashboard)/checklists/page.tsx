"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Flag, ShieldCheck } from "lucide-react";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useChecklistData } from "@/hooks/use-api";

export default function ChecklistsPage() {
  const { data, isLoading, error } = useChecklistData();

  if (isLoading) return <PageLoader label="Loading compliance" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load compliance"} />;

  const completion = Math.round(data.completion * 100);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Compliance center</p>
          <h1 className="text-3xl font-semibold text-slate-900">Avoid preventable rejections.</h1>
          <p className="text-sm text-slate-600">
            GrantSpec interprets each RFP and highlights requirements, missing docs, and risk areas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="info">{completion}% checklist completion</Badge>
          <Button>Export checklist</Button>
        </div>
      </header>

      {data.sections.length === 0 && (
        <EmptyState title="No checklist items" description="Kick off a proposal to see compliance signals." />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.sections.map((section) => (
          <Card key={section.section} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">{section.section}</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {
                    section.items.filter((item) => item.status === "complete").length
                  }
                  /{section.items.length} complete
                </h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-blue-500" />
            </div>
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <p className="text-sm text-slate-700">{item.label}</p>
                  {item.status === "complete" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  {item.status === "missing" && <Badge tone="warning">Missing</Badge>}
                  {item.status === "flag" && (
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Flag className="h-4 w-4" />
                      Review
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
