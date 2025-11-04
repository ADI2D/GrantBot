import { createServerSupabase } from "@/lib/supabase-server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, DollarSign, Zap } from "lucide-react";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface TokenUsageByClient {
  client_id: string;
  client_name: string;
  total_tokens: number;
  total_cost: number;
  prompt_tokens: number;
  completion_tokens: number;
  event_count: number;
}

interface TokenUsageByProposal {
  proposal_id: string;
  proposal_title: string;
  client_name: string;
  total_tokens: number;
  total_cost: number;
  operation_type: string;
  event_count: number;
}

interface DailyUsage {
  date: string;
  total_tokens: number;
  total_cost: number;
}

export default async function FreelancerUsagePage() {
  const supabase = await createServerSupabase();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in to view usage</div>;
  }

  // Get overall usage statistics
  const { data: overallUsage } = await supabase
    .from("ai_cost_events")
    .select("prompt_tokens, completion_tokens, total_tokens, cost_usd")
    .eq("freelancer_user_id", user.id);

  const totalTokens = overallUsage?.reduce((sum, event) => sum + event.total_tokens, 0) || 0;
  const totalCost = overallUsage?.reduce((sum, event) => sum + event.cost_usd, 0) || 0;
  const totalPromptTokens = overallUsage?.reduce((sum, event) => sum + event.prompt_tokens, 0) || 0;
  const totalCompletionTokens = overallUsage?.reduce((sum, event) => sum + event.completion_tokens, 0) || 0;

  // Get usage by client
  const { data: clientUsageData } = await supabase
    .from("ai_cost_events")
    .select(`
      freelancer_client_id,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      cost_usd,
      freelancer_clients (
        id,
        name
      )
    `)
    .eq("freelancer_user_id", user.id)
    .not("freelancer_client_id", "is", null);

  // Aggregate by client
  const clientUsageMap = new Map<string, TokenUsageByClient>();
  clientUsageData?.forEach((event: any) => {
    const clientId = event.freelancer_client_id;
    const clientName = event.freelancer_clients?.name || "Unknown Client";

    if (!clientUsageMap.has(clientId)) {
      clientUsageMap.set(clientId, {
        client_id: clientId,
        client_name: clientName,
        total_tokens: 0,
        total_cost: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        event_count: 0,
      });
    }

    const usage = clientUsageMap.get(clientId)!;
    usage.total_tokens += event.total_tokens;
    usage.total_cost += event.cost_usd;
    usage.prompt_tokens += event.prompt_tokens;
    usage.completion_tokens += event.completion_tokens;
    usage.event_count += 1;
  });

  const clientUsage = Array.from(clientUsageMap.values()).sort((a, b) => b.total_cost - a.total_cost);

  // Get usage by proposal
  const { data: proposalUsageData } = await supabase
    .from("ai_cost_events")
    .select(`
      freelancer_proposal_id,
      total_tokens,
      cost_usd,
      operation_type,
      freelancer_proposals (
        id,
        title,
        freelancer_clients (
          name
        )
      )
    `)
    .eq("freelancer_user_id", user.id)
    .not("freelancer_proposal_id", "is", null);

  // Aggregate by proposal
  const proposalUsageMap = new Map<string, TokenUsageByProposal>();
  proposalUsageData?.forEach((event: any) => {
    const proposalId = event.freelancer_proposal_id;
    const proposalTitle = event.freelancer_proposals?.title || "Unknown Proposal";
    const clientName = event.freelancer_proposals?.freelancer_clients?.name || "Unknown Client";
    const operationType = event.operation_type || "general";

    if (!proposalUsageMap.has(proposalId)) {
      proposalUsageMap.set(proposalId, {
        proposal_id: proposalId,
        proposal_title: proposalTitle,
        client_name: clientName,
        total_tokens: 0,
        total_cost: 0,
        operation_type: operationType,
        event_count: 0,
      });
    }

    const usage = proposalUsageMap.get(proposalId)!;
    usage.total_tokens += event.total_tokens;
    usage.total_cost += event.cost_usd;
    usage.event_count += 1;
  });

  const proposalUsage = Array.from(proposalUsageMap.values()).sort((a, b) => b.total_cost - a.total_cost);

  // Get daily usage for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: dailyUsageData } = await supabase
    .from("ai_cost_events")
    .select("created_at, total_tokens, cost_usd")
    .eq("freelancer_user_id", user.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Aggregate by day
  const dailyUsageMap = new Map<string, DailyUsage>();
  dailyUsageData?.forEach((event) => {
    const date = new Date(event.created_at).toISOString().split("T")[0];

    if (!dailyUsageMap.has(date)) {
      dailyUsageMap.set(date, {
        date,
        total_tokens: 0,
        total_cost: 0,
      });
    }

    const usage = dailyUsageMap.get(date)!;
    usage.total_tokens += event.total_tokens;
    usage.total_cost += event.cost_usd;
  });

  const dailyUsage = Array.from(dailyUsageMap.values());

  // Get monthly usage for last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1); // Start of month

  const { data: monthlyUsageData } = await supabase
    .from("ai_cost_events")
    .select("created_at, total_tokens, cost_usd")
    .eq("freelancer_user_id", user.id)
    .gte("created_at", twelveMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  // Aggregate by month
  interface MonthlyUsage {
    month: string;
    monthLabel: string;
    total_tokens: number;
    total_cost: number;
  }

  const monthlyUsageMap = new Map<string, MonthlyUsage>();
  monthlyUsageData?.forEach((event) => {
    const date = new Date(event.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

    if (!monthlyUsageMap.has(monthKey)) {
      monthlyUsageMap.set(monthKey, {
        month: monthKey,
        monthLabel,
        total_tokens: 0,
        total_cost: 0,
      });
    }

    const usage = monthlyUsageMap.get(monthKey)!;
    usage.total_tokens += event.total_tokens;
    usage.total_cost += event.cost_usd;
  });

  const monthlyUsage = Array.from(monthlyUsageMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // Calculate max values for chart scaling
  const maxMonthlyTokens = Math.max(...monthlyUsage.map(m => m.total_tokens), 1);
  const maxMonthlyCost = Math.max(...monthlyUsage.map(m => m.total_cost), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Token usage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor your AI token consumption and costs across all clients and projects.
        </p>
      </div>

      {/* Overview Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total tokens</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total cost</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${totalCost.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Prompt tokens</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalPromptTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Completion tokens</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCompletionTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-orange-100 p-3">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </Card>
      </section>

      {/* Usage by Client */}
      <Card className="border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Usage by client</h2>
        <p className="mt-1 text-sm text-slate-600">
          Token consumption broken down by each client you work with.
        </p>

        {clientUsage.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="pb-3 font-semibold text-slate-900">Client</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Tokens</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Cost</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientUsage.map((client) => (
                  <tr key={client.client_id} className="text-slate-700">
                    <td className="py-3 font-medium">{client.client_name}</td>
                    <td className="py-3 text-right">{client.total_tokens.toLocaleString()}</td>
                    <td className="py-3 text-right">${client.total_cost.toFixed(2)}</td>
                    <td className="py-3 text-right">{client.event_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">
            No client usage data yet. Start creating proposals to see token usage.
          </p>
        )}
      </Card>

      {/* Usage by Proposal */}
      <Card className="border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Usage by proposal</h2>
        <p className="mt-1 text-sm text-slate-600">
          Token consumption for each proposal you've worked on.
        </p>

        {proposalUsage.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="pb-3 font-semibold text-slate-900">Proposal</th>
                  <th className="pb-3 font-semibold text-slate-900">Client</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Tokens</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposalUsage.map((proposal) => (
                  <tr key={proposal.proposal_id} className="text-slate-700">
                    <td className="py-3 font-medium">{proposal.proposal_title}</td>
                    <td className="py-3 text-slate-600">{proposal.client_name}</td>
                    <td className="py-3 text-right">{proposal.total_tokens.toLocaleString()}</td>
                    <td className="py-3 text-right">${proposal.total_cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">
            No proposal usage data yet. Start using AI features in your proposals.
          </p>
        )}
      </Card>

      {/* Monthly Usage Trend - Last 12 Months */}
      {monthlyUsage.length > 0 && (
        <Card className="border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Monthly usage trend (Last 12 months)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Longitudinal tracking of your token consumption by month.
          </p>

          {/* Token Usage Chart */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">Token consumption</h3>
            <div className="mt-4 space-y-3">
              {monthlyUsage.map((month) => {
                const widthPercentage = (month.total_tokens / maxMonthlyTokens) * 100;
                return (
                  <div key={month.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{month.monthLabel}</span>
                      <span className="text-slate-900">{month.total_tokens.toLocaleString()} tokens</span>
                    </div>
                    <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cost Chart */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700">Cost trend</h3>
            <div className="mt-4 space-y-3">
              {monthlyUsage.map((month) => {
                const widthPercentage = (month.total_cost / maxMonthlyCost) * 100;
                return (
                  <div key={month.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{month.monthLabel}</span>
                      <span className="text-slate-900">${month.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Daily Usage Trend */}
      {dailyUsage.length > 0 && (
        <Card className="border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Daily usage (Last 30 days)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track your token consumption over time.
          </p>

          <div className="mt-6 space-y-2">
            {dailyUsage.slice(-10).map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{formatDate(day.date)}</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-900">{day.total_tokens.toLocaleString()} tokens</span>
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    ${day.total_cost.toFixed(2)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
