import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";
import { plans } from "@/lib/plans";
import { computeQuotaStatus } from "@/lib/quota";
import { getServiceSupabaseClient } from "@/lib/supabase-client";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    quarterStart.setHours(0, 0, 0, 0);

    const { count: proposalsThisMonth } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", firstDayOfMonth.toISOString());

    const { count: submissionsThisQuarter } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .neq("status", "drafting")
      .gte("updated_at", quarterStart.toISOString());

    const { data: org } = await supabase
      .from("organizations")
      .select("plan_id, stripe_customer_id")
      .eq("id", orgId)
      .single();

    const planId = org?.plan_id ?? "starter";
    const activePlan = plans.find((plan) => plan.id === planId) ?? plans[0];
    const usageStatus = computeQuotaStatus(
      activePlan.maxProposalsPerMonth,
      proposalsThisMonth ?? 0,
    );
    const nextReset = new Date(
      firstDayOfMonth.getFullYear(),
      firstDayOfMonth.getMonth() + 1,
      1,
    ).toISOString();

    let upcomingInvoice: { amount: number; date: string } | null = null;
    let lastPayment: { amount: number; date: string } | null = null;

    const { data: invoiceRows } = await supabase
      .from("billing_payments")
      .select("stripe_invoice_id, amount, currency, status, due_date, paid_at, created_at")
      .eq("organization_id", orgId)
      .order("due_date", { ascending: false })
      .limit(12);

    if (invoiceRows?.length) {
      const paidInvoice = invoiceRows.find((row) => row.status === "paid" && row.paid_at);
      if (paidInvoice) {
        lastPayment = {
          amount: Number(paidInvoice.amount ?? 0),
          date: paidInvoice.paid_at ?? paidInvoice.due_date ?? nextReset,
        };
      }

      const upcomingRow = invoiceRows.find((row) =>
        ["open", "draft", "uncollectible"].includes(row.status ?? ""),
      );
      if (upcomingRow?.due_date) {
        upcomingInvoice = {
          amount: Number(upcomingRow.amount ?? 0),
          date: upcomingRow.due_date,
        };
      }
    }

    if (!lastPayment && stripeSecret && org?.stripe_customer_id) {
      try {
        const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
        const invoices = await stripe.invoices.list({
          customer: org.stripe_customer_id,
          status: "paid",
          limit: 1,
        });
        const last = invoices.data.at(0);
        if (last?.amount_paid) {
          const paidAt =
            last.status_transitions?.paid_at ??
            last.status_transitions?.marked_uncollectible_at ??
            last.created;
          lastPayment = {
            amount: last.amount_paid / 100,
            date: new Date(paidAt * 1000).toISOString(),
          };
        }
      } catch (historyError) {
        console.error("[billing] invoice history fallback error", historyError);
      }
    }

    return NextResponse.json({
      planId,
      planLimit: activePlan.maxProposalsPerMonth,
      planPrice: activePlan.price,
      proposalsThisMonth: proposalsThisMonth ?? 0,
      submissionsThisQuarter: submissionsThisQuarter ?? 0,
      nextReset,
      usageStatus,
      stripeCustomerLinked: Boolean(org?.stripe_customer_id),
      upcomingInvoice,
      invoices: (invoiceRows ?? []).map((row) => ({
        id: row.stripe_invoice_id,
        amount: Number(row.amount ?? 0),
        currency: row.currency ?? "USD",
        status: row.status ?? "unknown",
        dueDate: row.due_date,
        paidAt: row.paid_at,
        createdAt: row.created_at,
      })),
      lastPayment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const { planId } = await request.json();

    const targetPlan = plans.find((plan) => plan.id === planId);
    if (!targetPlan) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const adminClient = getServiceSupabaseClient();
    const { error } = await adminClient
      .from("organizations")
      .update({ plan_id: targetPlan.id })
      .eq("id", orgId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ planId: targetPlan.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
