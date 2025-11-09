export type UsageRecord = {
  proposalsThisMonth: number;
  submissionsThisQuarter: number;
  planId: string;
};

export function computeQuotaStatus(planLimit: number, currentUsage: number) {
  const usageRatio = planLimit ? currentUsage / planLimit : 0;
  const remaining = Math.max(planLimit - currentUsage, 0);
  return {
    usageRatio,
    remaining,
    status: usageRatio >= 1 ? "limit" : usageRatio >= 0.75 ? "warning" : "ok",
  };
}
