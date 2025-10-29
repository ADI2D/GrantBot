"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { plans } from "@/lib/plans";
import { formatCurrency } from "@/lib/format";
import { useBillingData } from "@/hooks/use-api";
import { useOrg } from "@/hooks/use-org";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
      setMessage(
        portalError instanceof Error ? portalError.message : "Unable to open billing portal",
      );
    },
  });

  const planMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/billing?orgId=${currentOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<{ planId: string }>;
    },
    onSuccess: () => {
      setMessage("Plan updated. Refreshing usage…");
      router.refresh();
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : "Plan update failed");
    },
  });

  if (isLoading) return <PageLoader label="Loading billing" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load billing"} />;

  const activePlan = plans.find((plan) => plan.id === data.planId) ?? plans[0];
  const usagePercent = Math.min(Math.round(data.usageStatus.usageRatio * 100), 100);
  const resetDate = new Date(data.nextReset);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Billing & Limits</p>
          <h1 className="text-3xl font-semibold text-slate-900">Manage your GrantBot plan.</h1>
          <p className="text-sm text-slate-600">
            Track usage, review plan benefits, and access the Stripe customer portal to update payment
            details.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </header>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Current plan</p>
            <h2 className="text-lg font-semibold text-slate-900">{activePlan.name}</h2>
            <p className="text-sm text-slate-500">{activePlan.description}</p>
          </div>
          <Badge tone={data.proposalsThisMonth >= data.planLimit ? "warning" : "info"}>
            {data.proposalsThisMonth}/{data.planLimit} proposals this month
          </Badge>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>This month’s usage</span>
            <span>{usagePercent}%</span>
          </div>
          <Progress value={usagePercent} />
          <p className="text-xs text-slate-500">
            {data.usageStatus.status === "limit"
              ? "You’ve reached this month’s proposal limit."
              : data.usageStatus.status === "warning"
                ? `${data.usageStatus.remaining} proposal credits remain this month.`
                : `${data.usageStatus.remaining} proposals remaining before reset.`}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
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
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-500">Submissions this quarter</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {data.submissionsThisQuarter}
          </p>
          <p className="text-sm text-slate-500">
            Quarter resets on {resetDate.toLocaleDateString()}.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-500">Upcoming invoice</p>
          {data.upcomingInvoice ? (
            <>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                ${data.upcomingInvoice.amount}
              </p>
              <p className="text-sm text-slate-500">
                Bills on {new Date(data.upcomingInvoice.date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Connect Stripe to view upcoming invoices and payment schedule.
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-slate-500">Latest payment</p>
          {data.lastPayment ? (
            <>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                ${data.lastPayment.amount}
              </p>
              <p className="text-sm text-slate-500">
                Paid on {new Date(data.lastPayment.date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No payment records yet. Finish setup in the billing portal to start billing.
            </p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`p-5 space-y-3 ${plan.id === activePlan.id ? "border-blue-200" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-slate-500">
                {plan.id === activePlan.id ? "Active" : "Available"}
              </p>
              <Badge tone={plan.id === activePlan.id ? "info" : "neutral"}>
                {plan.maxProposalsPerMonth} proposals / mo
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="text-3xl font-bold text-slate-900">
              ${plan.price}
              <span className="text-base font-normal text-slate-500">/mo</span>
            </p>
            <p className="text-sm text-slate-600">{plan.description}</p>
            <Button
              variant={plan.id === activePlan.id ? "secondary" : "ghost"}
              className="mt-2 w-full"
              disabled={plan.id === activePlan.id || planMutation.isLoading}
              onClick={() => planMutation.mutate(plan.id)}
            >
              {plan.id === activePlan.id
                ? "Current plan"
                : planMutation.isLoading
                  ? "Updating..."
                  : "Switch plan"}
            </Button>
          </Card>
        ))}
      </section>

      {!data.stripeCustomerLinked && (
        <Card className="border-dashed border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Connect Stripe</h3>
          <p className="mt-2 text-sm text-slate-600">
            Stripe isn’t connected yet. Click “Manage billing” to complete setup. Once connected we’ll
            surface live invoices, payment history, and allow plan self-service upgrades.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Invoice history</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Receipts & billing timeline
            </h3>
          </div>
          <Button
            variant="ghost"
            className="text-sm text-blue-600"
            disabled={!data.stripeCustomerLinked}
            onClick={() => portalMutation.mutate()}
          >
            View in Stripe
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No invoices yet. Connect Stripe and submit your first payment to see receipts here.
                  </td>
                </tr>
              ) : (
                data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="bg-white">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{invoice.id.slice(0, 8)}…</p>
                      <p className="text-xs text-slate-500">
                        Created {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          invoice.status === "paid"
                            ? "success"
                            : invoice.status === "open"
                              ? "info"
                              : invoice.status?.includes("fail") || invoice.status === "uncollectible"
                                ? "warning"
                                : "neutral"
                        }
                      >
                        {invoice.status ?? "unknown"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(invoice.amount ?? 0, invoice.currency ?? "USD")}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.paidAt
                        ? new Date(invoice.paidAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
