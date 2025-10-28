"use client";

import { useMemo } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { plans } from "@/lib/plans";
import { computeQuotaStatus } from "@/lib/quota";

export function QuotaBanner({
  planId,
  proposalsThisMonth,
}: {
  planId: string;
  proposalsThisMonth: number;
}) {
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const quota = useMemo(
    () => computeQuotaStatus(plan.maxProposalsPerMonth, proposalsThisMonth),
    [plan, proposalsThisMonth],
  );

  const toneMap = {
    ok: { color: "bg-emerald-50", label: "On track" },
    warning: { color: "bg-amber-50", label: "Approaching limit" },
    limit: { color: "bg-rose-50", label: "Limit reached" },
  } as const;

  const tone = toneMap[quota.status];

  return (
    <Card className={`flex items-center justify-between gap-4 border-none p-4 ${tone.color}`}>
      <div className="flex items-center gap-3">
        {quota.status === "limit" ? (
          <AlertTriangle className="h-5 w-5 text-rose-500" />
        ) : (
          <Zap className="h-5 w-5 text-amber-500" />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900">{plan.name} plan usage</p>
          <p className="text-xs text-slate-500">
            {proposalsThisMonth}/{plan.maxProposalsPerMonth} proposals this month. {tone.label}.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={quota.status === "limit" ? "warning" : "neutral"}>{tone.label}</Badge>
        <Button variant="secondary" size="sm">
          Upgrade plan
        </Button>
      </div>
    </Card>
  );
}
