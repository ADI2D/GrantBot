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
  seatLimit: number | null;
  maxOpportunities: number | null;
  maxDocuments: number | null;
  allowAi: boolean;
  allowAnalytics: boolean;
};

let planCache: PricingPlan[] | null = null;
let lastFetched = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchPlans() {
  if (planCache && Date.now() - lastFetched < CACHE_TTL_MS) {
    return planCache;
  }

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("pricing_plans")
      .select(
        "id, name, monthly_price_cents, max_proposals_per_month, description, stripe_product_id, stripe_price_id, active, seat_limit, max_opportunities, max_documents, allow_ai, allow_analytics",
      )
      .eq("active", true)
      .order("monthly_price_cents", { ascending: true });

    if (error) {
      console.warn("[pricing-plans] Error fetching plans (table may not exist yet):", error.message);
      // Return default plans if table doesn't exist
      return getDefaultPlans();
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
        seatLimit: plan.seat_limit ?? null,
        maxOpportunities: plan.max_opportunities ?? null,
        maxDocuments: plan.max_documents ?? null,
        allowAi: plan.allow_ai ?? true,
        allowAnalytics: plan.allow_analytics ?? true,
      })) ?? [];
    lastFetched = Date.now();
    return planCache;
  } catch (error) {
    console.warn("[pricing-plans] Failed to fetch plans:", error);
    return getDefaultPlans();
  }
}

function getDefaultPlans(): PricingPlan[] {
  return [
    {
      id: "workspace_free",
      name: "Workspace (Free)",
      monthlyPriceCents: 0,
      maxProposalsPerMonth: 1,
      description: "Single-user workspace with manual tracking tools.",
      stripeProductId: null,
      stripePriceId: null,
      active: true,
      seatLimit: 1,
      maxOpportunities: 3,
      maxDocuments: 3,
      allowAi: false,
      allowAnalytics: false,
    },
    {
      id: "starter",
      name: "Starter",
      monthlyPriceCents: 24900,
      maxProposalsPerMonth: 2,
      description: "Perfect for small teams getting started",
      stripeProductId: null,
      stripePriceId: null,
      active: true,
      seatLimit: 3,
      maxOpportunities: 10,
      maxDocuments: 20,
      allowAi: false,
      allowAnalytics: false,
    },
    {
      id: "growth",
      name: "Growth",
      monthlyPriceCents: 49900,
      maxProposalsPerMonth: 10,
      description: "For growing organizations with more needs",
      stripeProductId: null,
      stripePriceId: null,
      active: true,
      seatLimit: 10,
      maxOpportunities: 50,
      maxDocuments: 100,
      allowAi: true,
      allowAnalytics: true,
    },
    {
      id: "impact",
      name: "Impact",
      monthlyPriceCents: 99900,
      maxProposalsPerMonth: 999,
      description: "Unlimited proposals for high-volume teams",
      stripeProductId: null,
      stripePriceId: null,
      active: true,
      seatLimit: null,
      maxOpportunities: null,
      maxDocuments: null,
      allowAi: true,
      allowAnalytics: true,
    },
  ];
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
    .select(
      "id, name, monthly_price_cents, max_proposals_per_month, description, stripe_product_id, stripe_price_id, active, seat_limit, max_opportunities, max_documents, allow_ai, allow_analytics",
    )
    .order("monthly_price_cents", { ascending: true });

  if (error) {
    if (error.message.includes("pricing_plans")) {
      console.warn("[pricing-plans] listAllPricingPlans: table missing, returning defaults");
      return getDefaultPlans();
    }
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
      seatLimit: plan.seat_limit ?? null,
      maxOpportunities: plan.max_opportunities ?? null,
      maxDocuments: plan.max_documents ?? null,
      allowAi: plan.allow_ai ?? true,
      allowAnalytics: plan.allow_analytics ?? true,
    })) ?? []
  );
}
