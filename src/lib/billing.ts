import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPricingPlan, listPricingPlans } from "@/lib/pricing-plans";

export async function getBillingSummary(client: SupabaseClient<Database>, orgId: string) {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const { count } = await client
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", firstDayOfMonth.toISOString());

  const { data: org } = await client
    .from("organizations")
    .select("plan_id")
    .eq("id", orgId)
    .single();

  const planId = org?.plan_id ?? "starter";
  let plan = await getPricingPlan(planId);

  if (!plan) {
    const allPlans = await listPricingPlans();
    plan = allPlans[0] ?? {
      id: "starter",
      name: "Starter",
      monthlyPriceCents: 24900,
      maxProposalsPerMonth: 2,
      description: null,
      stripeProductId: null,
      stripePriceId: null,
      active: true,
      seatLimit: 3,
      maxOpportunities: 10,
      maxDocuments: 20,
      allowAi: false,
      allowAnalytics: false,
    };
  }

  return {
    planId,
    plan,
    proposalsThisMonth: count ?? 0,
    remaining: Math.max(plan.maxProposalsPerMonth - (count ?? 0), 0),
  };
}

export function assertWithinQuota(planLimit: number, currentUsage: number) {
  if (planLimit && currentUsage >= planLimit) {
    throw new Error("Plan limit reached. Upgrade to create more proposals.");
  }
}
