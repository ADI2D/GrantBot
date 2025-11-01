import { getServiceSupabaseClient } from "@/lib/supabase-client";

export type FeatureFlagRecord = {
  id: number;
  key: string;
  description: string | null;
  rolloutPercentage: number;
  enabled: boolean;
  targetPlans: unknown;
  targetCustomerIds: unknown;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchFeatureFlags(): Promise<FeatureFlagRecord[]> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("id, key, description, rollout_percentage, enabled, target_plans, target_customer_ids, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load feature flags");
  }

  return (data ?? []).map((flag) => ({
    id: flag.id,
    key: flag.key,
    description: flag.description,
    rolloutPercentage: flag.rollout_percentage,
    enabled: flag.enabled,
    targetPlans: flag.target_plans,
    targetCustomerIds: flag.target_customer_ids,
    createdAt: flag.created_at,
    updatedAt: flag.updated_at,
  }));
}
