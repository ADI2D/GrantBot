"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { plans } from "@/lib/plans";
import { useBillingData } from "@/hooks/use-api";
import { useOrg } from "@/hooks/use-org";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader, PageError } from "@/components/ui/page-state";

export default function BillingPage() {
  const { data, isLoading, error } = useBillingData();
  const { currentOrgId } = useOrg();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/billing/portal?orgId=${currentOrgId}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<{ url: string; warning?: string }>;
    },
    onSuccess: (payload) => {
      if (payload.warning) {
        setMessage(payload.warning);
      }
      if (payload.url) {
        window.location.href = payload.url;
      }
    },
    onError: (portalError) => {
      setMessage(portalError instanceof Error ? portalError.message : "Unable to open billing portal");
    },
  });

  if (isLoading) return <PageLoader label="Loading billing" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load billing"} />;

  const activePlan = plans.find((plan) => plan.id === data.planId) ?? plans[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Billing & Limits</p>
          <h1 className="text-3xl font-semibold text-slate-900">Manage your GrantBot plan.</h1>
          <p className="text-sm text-slate-600">
            Track usage, review plan benefits, and access the Stripe customer portal to update payment details.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </header>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Current plan</p>
            <h2 className="text-lg font-semibold text-slate-900">{activePlan.name}</h2>
            <p className="text-sm text-slate-500">{activePlan.description}</p>
          </div>
          <Badge tone={data.proposalsThisMonth >= activePlan.maxProposalsPerMonth ? "warning" : "info"}>
            {data.proposalsThisMonth}/{activePlan.maxProposalsPerMonth} proposals this month
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isLoading}
          >
            {portalMutation.isLoading ? "Opening portal..." : "Manage billing"}
          </Button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`p-5 ${plan.id === activePlan.id ? "border-blue-200" : ""}`}>
            <p className="text-xs uppercase text-slate-500">{plan.id === activePlan.id ? "Active" : "Available"}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="text-3xl font-bold text-slate-900">${plan.price}<span className="text-base font-normal text-slate-500">/mo</span></p>
            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
            <Button variant="secondary" className="mt-4 w-full" disabled={plan.id === activePlan.id}>
              {plan.id === activePlan.id ? "Current plan" : "Contact sales"}
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
