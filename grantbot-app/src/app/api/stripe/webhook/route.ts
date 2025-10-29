import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPlanFromPrice } from "@/lib/stripe-plan-map";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
const supabaseUrl = process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);

async function resolveOrganizationId(customerId: string, fallbackOrgId?: string | null) {
  if (!customerId) return null;

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve organization by customer", error);
    return null;
  }

  if (data?.id) return data.id;

  if (fallbackOrgId) {
    const { data: orgById } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", fallbackOrgId)
      .maybeSingle();

    if (orgById?.id) {
      await supabaseAdmin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", orgById.id);
      return orgById.id;
    }
  }

  return null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planId = getPlanFromPrice(priceId);
  if (!customerId || !planId) return;

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update({
      plan_id: planId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
    })
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) {
    console.error("Failed to sync subscription", error);
    throw error;
  }

  if (!data?.length && subscription.metadata?.organization_id) {
    await supabaseAdmin
      .from("organizations")
      .update({
        plan_id: planId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
      })
      .eq("id", subscription.metadata.organization_id);
  }
}

async function handlePaymentFailure(customerId: string | Stripe.Customer | Stripe.DeletedCustomer) {
  if (!customerId || typeof customerId !== "string") return;
  await supabaseAdmin
    .from("organizations")
    .update({ plan_id: "starter" })
    .eq("stripe_customer_id", customerId);
}

async function upsertInvoice(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  const organizationId = await resolveOrganizationId(
    customerId ?? "",
    (invoice.metadata as Record<string, string> | undefined)?.organization_id,
  );

  if (!organizationId || !customerId) {
    console.warn("Unable to resolve organization for invoice", invoice.id);
    return;
  }

  const amount =
    (invoice.amount_paid ?? invoice.amount_due ?? invoice.total ?? 0) / 100;
  const currency = invoice.currency?.toUpperCase() ?? "USD";
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date * 1000).toISOString()
    : invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null;
  const paidAt =
    invoice.status === "paid"
      ? new Date(
          (invoice.status_transitions?.paid_at ?? invoice.created) * 1000,
        ).toISOString()
      : null;

  const { error } = await supabaseAdmin.from("billing_payments").upsert(
    {
      organization_id: organizationId,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      amount,
      currency,
      status: invoice.status ?? "unknown",
      due_date: dueDate,
      paid_at: paidAt,
      metadata: invoice as Stripe.Invoice,
    },
    { onConflict: "stripe_invoice_id" },
  );

  if (error) {
    console.error("Failed to upsert invoice", invoice.id, error);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.created":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.created":
    case "invoice.finalized":
    case "invoice.payment_succeeded":
    case "invoice.paid":
      await upsertInvoice(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await upsertInvoice(event.data.object as Stripe.Invoice);
      await handlePaymentFailure((event.data.object as Stripe.Invoice).customer ?? "");
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
