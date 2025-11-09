"use client";

import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/format";

export type PricingManagerPlan = {
  id: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  maxProposalsPerMonth: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
  seatLimit: number | null;
  maxOpportunities: number | null;
  maxDocuments: number | null;
  allowAi: boolean;
  allowAnalytics: boolean;
};

type PlanLike = PricingManagerPlan & {
  monthly_price_cents?: number;
  max_proposals_per_month?: number;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  seat_limit?: number | null;
  max_opportunities?: number | null;
  max_documents?: number | null;
  allow_ai?: boolean;
  allow_analytics?: boolean;
};

export function PricingManager({ initialPlans }: { initialPlans: PricingManagerPlan[] }) {
  const [plans, setPlans] = useState<PricingManagerPlan[]>(initialPlans);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePlanChange = (index: number, field: keyof PricingManagerPlan, value: unknown) => {
    setPlans((prev) => {
      const next = [...prev];
      let parsedValue: unknown = value;
      if (field === "monthlyPriceCents") {
        parsedValue = Number(value);
      } else if (
        field === "maxProposalsPerMonth" ||
        field === "seatLimit" ||
        field === "maxOpportunities" ||
        field === "maxDocuments"
      ) {
        parsedValue = value === "" || value === null ? null : Number(value);
      }
      next[index] = {
        ...next[index],
        [field]: parsedValue,
      } as PricingManagerPlan;
      return next;
    });
  };

  const savePlan = (plan: PricingManagerPlan) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const response = await fetch("/api/admin/pricing-plans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            monthlyPriceCents: plan.monthlyPriceCents,
            maxProposalsPerMonth: plan.maxProposalsPerMonth,
            seatLimit: plan.seatLimit,
            maxOpportunities: plan.maxOpportunities,
            maxDocuments: plan.maxDocuments,
            allowAi: plan.allowAi,
            allowAnalytics: plan.allowAnalytics,
            active: plan.active,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const { plan: updated } = (await response.json()) as { plan: PlanLike };
        const normalized = normalizePlan(updated);
        setSuccess(`Saved ${normalized.name}`);
        setPlans((prev) =>
          prev
            .map((item) => (item.id === normalized.id ? normalized : item))
            .sort((a, b) => a.monthlyPriceCents - b.monthlyPriceCents),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save plan");
      }
    });
  };

  const createPlan = (plan: PricingManagerPlan) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const response = await fetch("/api/admin/pricing-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            monthlyPriceCents: plan.monthlyPriceCents,
            maxProposalsPerMonth: plan.maxProposalsPerMonth,
            seatLimit: plan.seatLimit,
            maxOpportunities: plan.maxOpportunities,
            maxDocuments: plan.maxDocuments,
            allowAi: plan.allowAi,
            allowAnalytics: plan.allowAnalytics,
            active: plan.active,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const { plan: created } = (await response.json()) as { plan: PlanLike };
        const normalized = normalizePlan(created);
        setSuccess(`Created ${normalized.name}`);
        setPlans((prev) => [...prev, normalized].sort((a, b) => a.monthlyPriceCents - b.monthlyPriceCents));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create plan");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Price (USD)</th>
                <th className="px-4 py-3 text-left">Proposals / mo</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Opportunities</th>
                <th className="px-4 py-3 text-left">Documents</th>
                <th className="px-4 py-3 text-left">AI</th>
                <th className="px-4 py-3 text-left">Analytics</th>
                <th className="px-4 py-3 text-left">Stripe price</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {plans.map((plan, index) => (
                <tr key={plan.id}>
                  <td className="min-w-[240px] px-4 py-3 align-top">
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      value={plan.name}
                      onChange={(event) => handlePlanChange(index, "name", event.target.value)}
                      disabled={isPending}
                    />
                    <textarea
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:border-slate-400 focus:outline-none"
                      value={plan.description ?? ""}
                      onChange={(event) => handlePlanChange(index, "description", event.target.value)}
                      disabled={isPending}
                    />
                    <p className="mt-1 text-[11px] uppercase text-slate-400">ID: {plan.id}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      value={Math.round(plan.monthlyPriceCents / 100)}
                      onChange={(event) =>
                        handlePlanChange(index, "monthlyPriceCents", Number(event.target.value) * 100)
                      }
                      min={0}
                      disabled={isPending}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(plan.monthlyPriceCents / 100)} billed monthly
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      value={plan.maxProposalsPerMonth}
                      onChange={(event) =>
                        handlePlanChange(index, "maxProposalsPerMonth", Number(event.target.value))
                      }
                      min={0}
                      disabled={isPending}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      value={plan.seatLimit ?? ""}
                      placeholder="∞"
                      onChange={(event) =>
                        handlePlanChange(index, "seatLimit", event.target.value === "" ? null : Number(event.target.value))
                      }
                      min={0}
                      disabled={isPending}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      value={plan.maxOpportunities ?? ""}
                      placeholder="∞"
                      onChange={(event) =>
                        handlePlanChange(
                          index,
                          "maxOpportunities",
                          event.target.value === "" ? null : Number(event.target.value),
                        )
                      }
                      min={0}
                      disabled={isPending}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      value={plan.maxDocuments ?? ""}
                      placeholder="∞"
                      onChange={(event) =>
                        handlePlanChange(index, "maxDocuments", event.target.value === "" ? null : Number(event.target.value))
                      }
                      min={0}
                      disabled={isPending}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={plan.allowAi}
                        onChange={(event) => handlePlanChange(index, "allowAi", event.target.checked)}
                        disabled={isPending}
                      />
                      Enabled
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={plan.allowAnalytics}
                        onChange={(event) => handlePlanChange(index, "allowAnalytics", event.target.checked)}
                        disabled={isPending}
                      />
                      Enabled
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {plan.stripePriceId ?? <span className="text-amber-600">Not linked</span>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={plan.active}
                        onChange={(event) => handlePlanChange(index, "active", event.target.checked)}
                        disabled={isPending}
                      />
                      Active
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      onClick={() => savePlan(plan)}
                      disabled={isPending}
                    >
                      Save changes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewPlanForm
        onCreate={(plan) =>
          createPlan({
            ...plan,
            monthlyPriceCents: plan.monthlyPriceCents,
            maxProposalsPerMonth: plan.maxProposalsPerMonth,
          })
        }
        isSubmitting={isPending}
      />

      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function normalizePlan(plan: PlanLike): PricingManagerPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? null,
    monthlyPriceCents: plan.monthly_price_cents ?? plan.monthlyPriceCents ?? 0,
    maxProposalsPerMonth: plan.max_proposals_per_month ?? plan.maxProposalsPerMonth ?? 0,
    stripeProductId: plan.stripe_product_id ?? plan.stripeProductId ?? null,
    stripePriceId: plan.stripe_price_id ?? plan.stripePriceId ?? null,
    active: plan.active ?? true,
    seatLimit: plan.seat_limit ?? plan.seatLimit ?? null,
    maxOpportunities: plan.max_opportunities ?? plan.maxOpportunities ?? null,
    maxDocuments: plan.max_documents ?? plan.maxDocuments ?? null,
    allowAi: plan.allow_ai ?? plan.allowAi ?? true,
    allowAnalytics: plan.allow_analytics ?? plan.allowAnalytics ?? true,
  };
}

function NewPlanForm({
  onCreate,
  isSubmitting,
}: {
  onCreate: (plan: PricingManagerPlan) => void;
  isSubmitting: boolean;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(249);
  const [limit, setLimit] = useState(2);
  const [seatLimit, setSeatLimit] = useState<number | "">("");
  const [maxOpps, setMaxOpps] = useState<number | "">("");
  const [maxDocs, setMaxDocs] = useState<number | "">("");
  const [allowAi, setAllowAi] = useState(true);
  const [allowAnalytics, setAllowAnalytics] = useState(true);

  const handleSubmit = () => {
    if (!id.trim() || !name.trim()) return;
    onCreate({
      id: id.trim().toLowerCase(),
      name: name.trim(),
      description: description.trim() || null,
      monthlyPriceCents: Math.round(price * 100),
      maxProposalsPerMonth: limit,
      stripeProductId: null,
      stripePriceId: null,
      active: true,
      seatLimit: seatLimit === "" ? null : Number(seatLimit),
      maxOpportunities: maxOpps === "" ? null : Number(maxOpps),
      maxDocuments: maxDocs === "" ? null : Number(maxDocs),
      allowAi,
      allowAnalytics,
    });
    setId("");
    setName("");
    setDescription("");
    setPrice(249);
    setLimit(2);
    setSeatLimit("");
    setMaxOpps("");
    setMaxDocs("");
    setAllowAi(true);
    setAllowAnalytics(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Create new plan</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase text-slate-500">Plan ID</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            placeholder="impact"
            value={id}
            onChange={(event) => setId(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            placeholder="Impact"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Monthly price (USD)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={price}
            min={0}
            onChange={(event) => setPrice(Number(event.target.value))}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Proposal limit / month</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={limit}
            min={0}
            onChange={(event) => setLimit(Number(event.target.value))}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Seat limit</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={seatLimit}
            placeholder="∞"
            min={0}
            onChange={(event) => setSeatLimit(event.target.value === "" ? "" : Number(event.target.value))}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Opportunity limit</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={maxOpps}
            placeholder="∞"
            min={0}
            onChange={(event) => setMaxOpps(event.target.value === "" ? "" : Number(event.target.value))}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Document limit</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={maxDocs}
            placeholder="∞"
            min={0}
            onChange={(event) => setMaxDocs(event.target.value === "" ? "" : Number(event.target.value))}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase text-slate-500">AI features</label>
          <input
            type="checkbox"
            checked={allowAi}
            onChange={(event) => setAllowAi(event.target.checked)}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase text-slate-500">Analytics</label>
          <input
            type="checkbox"
            checked={allowAnalytics}
            onChange={(event) => setAllowAnalytics(event.target.checked)}
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-xs uppercase text-slate-500">Description</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          disabled={isSubmitting}
        />
      </div>
      <button
        type="button"
        className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving…" : "Create plan"}
      </button>
    </div>
  );
}
