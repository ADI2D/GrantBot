import { getServiceSupabaseClient } from "@/lib/supabase-client";

export type PricingPlan = {
  id: string;
  name: string;
  monthlyPriceCents: number;
  maxProposalsPerMonth: number;
  description: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
};

let planCache: PricingPlan[] | null = null;
let lastFetched = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchPlans() {
  if (planCache && Date.now() - lastFetched < CACHE_TTL_MS) {
    return planCache;
  }

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_plans")
    .select("id, name, monthly_price_cents, max_proposals_per_month, description, stripe_product_id, stripe_price_id, active")
    .eq("active", true)
    .order("monthly_price_cents", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  planCache =
    data?.map((plan) => ({
      id: plan.id,
      name: plan.name,
      monthlyPriceCents: plan.monthly_price_cents,
      maxProposalsPerMonth: plan.max_proposals_per_month,
      description: plan.description,
      stripeProductId: plan.stripe_product_id,
      stripePriceId: plan.stripe_price_id,
      active: plan.active,
    })) ?? [];
  lastFetched = Date.now();
  return planCache;
}

export async function listPricingPlans() {
  return fetchPlans();
}

export async function getPricingPlan(planId: string) {
  const plans = await listPricingPlans();
  return plans.find((plan) => plan.id === planId) ?? null;
}

export function invalidatePlanCache() {
  planCache = null;
  lastFetched = 0;
}

export async function listAllPricingPlans() {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_plans")
    .select("id, name, monthly_price_cents, max_proposals_per_month, description, stripe_product_id, stripe_price_id, active")
    .order("monthly_price_cents", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    data?.map((plan) => ({
      id: plan.id,
      name: plan.name,
      monthlyPriceCents: plan.monthly_price_cents,
      maxProposalsPerMonth: plan.max_proposals_per_month,
      description: plan.description,
      stripeProductId: plan.stripe_product_id,
      stripePriceId: plan.stripe_price_id,
      active: plan.active,
    })) ?? []
  );
}
