import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { formatCurrency } from "@/lib/format";

type CountResult = {
  count: number | null;
};

export type RevenueTrendPoint = {
  month: string;
  total: number;
};

export type AdminAnalyticsSnapshot = {
  activeOrganizations: number;
  activeMembers: number;
  proposalsThisMonth: number;
  winsThisMonth: number;
  winRateThisMonth: number;
  revenueTrend: RevenueTrendPoint[];
  currency: string;
  aiCostThisMonth: number;
  aiCostPerProposal: number | null;
};

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsSnapshot> {
  const supabase = getServiceSupabaseClient();

  const [
    orgCount,
    memberCount,
    proposalsResult,
    outcomesResult,
    paymentsResult,
    aiCostsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }) as Promise<CountResult>,
    supabase.from("org_members").select("id", { count: "exact", head: true }) as Promise<CountResult>,
    supabase
      .from("proposals")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("outcomes")
      .select("status, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(200),
    supabase
      .from("billing_payments")
      .select("amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("ai_cost_events")
      .select("cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (proposalsResult.error) {
    throw new Error("Failed to load proposals");
  }

  if (outcomesResult.error) {
    throw new Error("Failed to load outcomes");
  }

  if (paymentsResult.error) {
    throw new Error("Failed to load revenue data");
  }

  const aiCostRows = (() => {
    if (!aiCostsResult.error) {
      return aiCostsResult.data ?? [];
    }

    // Gracefully handle environments where the AI cost table has not been created yet
    if (isMissingTableError(aiCostsResult.error)) {
      console.warn("[admin-analytics] AI cost table missing — defaulting to zeroes");
      return [];
    }

    throw new Error(`Failed to load AI cost data: ${aiCostsResult.error.message}`);
  })();

  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  const proposalsThisMonth = (proposalsResult.data ?? []).filter((proposal) => {
    if (!proposal.created_at) return false;
    const created = new Date(proposal.created_at);
    return created.getUTCFullYear() === currentYear && created.getUTCMonth() === currentMonth;
  }).length;

  const outcomesThisMonth = (outcomesResult.data ?? []).filter((outcome) => {
    if (!outcome.recorded_at) return false;
    const recorded = new Date(outcome.recorded_at);
    return recorded.getUTCFullYear() === currentYear && recorded.getUTCMonth() === currentMonth;
  });

  const winsThisMonth = outcomesThisMonth.filter((outcome) => outcome.status === "funded").length;
  const winRateThisMonth =
    outcomesThisMonth.length === 0 ? 0 : Math.round((winsThisMonth / outcomesThisMonth.length) * 100);

  const revenueTrend = buildRevenueTrend(paymentsResult.data ?? []);
  const currency = paymentsResult.data?.[0]?.currency ?? "USD";

  const aiCostThisMonth = aiCostRows.reduce((sum, item) => {
    if (!item.created_at) return sum;
    const created = new Date(item.created_at);
    if (created.getUTCFullYear() === currentYear && created.getUTCMonth() === currentMonth) {
      return sum + Number(item.cost_usd ?? 0);
    }
    return sum;
  }, 0);

  const aiCostPerProposal = proposalsThisMonth > 0 ? Number((aiCostThisMonth / proposalsThisMonth).toFixed(2)) : null;

  return {
    activeOrganizations: orgCount.count ?? 0,
    activeMembers: memberCount.count ?? 0,
    proposalsThisMonth,
    winsThisMonth,
    winRateThisMonth,
    revenueTrend,
    currency,
    aiCostThisMonth,
    aiCostPerProposal,
  };
}

function buildRevenueTrend(
  payments: {
    amount: number | null;
    currency: string | null;
    status: string | null;
    created_at: string | null;
  }[],
): RevenueTrendPoint[] {
  const paidStatuses = new Set(["paid", "succeeded"]);
  const now = new Date();
  const months: RevenueTrendPoint[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    months.push({
      month: formatMonthLabel(date),
      total: sumForMonth(payments, key, paidStatuses),
    });
  }

  return months;
}

function sumForMonth(
  payments: {
    amount: number | null;
    currency: string | null;
    status: string | null;
    created_at: string | null;
  }[],
  key: string,
  paidStatuses: Set<string>,
) {
  return payments.reduce((sum, payment) => {
    if (!payment.created_at || !paidStatuses.has((payment.status ?? "").toLowerCase())) {
      return sum;
    }
    const created = new Date(payment.created_at);
    const paymentKey = `${created.getUTCFullYear()}-${created.getUTCMonth()}`;
    if (paymentKey === key) {
      return sum + Number(payment.amount ?? 0);
    }
    return sum;
  }, 0);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
  });
}

export function formatRevenueTrendValue(value: number, currency: string) {
  return formatCurrency(value, currency);
}

function isMissingTableError(error: { code?: string }) {
  return error.code === "42P01";
}
