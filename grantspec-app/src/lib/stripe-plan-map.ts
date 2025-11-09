import { getServiceSupabaseClient } from "@/lib/supabase-client";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: Map<string, string> | null = null;
let lastFetched = 0;

async function refreshCache() {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_plans")
    .select("id, stripe_price_id")
    .not("stripe_price_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  cache = new Map();
  (data ?? []).forEach((plan) => {
    if (plan.stripe_price_id) {
      cache?.set(plan.stripe_price_id, plan.id);
    }
  });
  lastFetched = Date.now();
}

export async function getPlanFromPrice(priceId?: string | null) {
  if (!priceId) return null;

  if (!cache || Date.now() - lastFetched > CACHE_TTL_MS) {
    await refreshCache();
  }

  return cache?.get(priceId) ?? null;
}

export function invalidatePricePlanCache() {
  cache = null;
  lastFetched = 0;
}
