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
    case "invoice.payment_failed":
      await handlePaymentFailure((event.data.object as Stripe.Invoice).customer ?? "");
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
