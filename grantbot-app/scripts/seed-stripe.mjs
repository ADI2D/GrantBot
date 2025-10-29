#!/usr/bin/env node

/**
 * Seed Stripe with a test customer + subscription and verify that the webhook
 * wrote an invoice to Supabase.
 *
 * Usage:
 *   node scripts/seed-stripe.mjs <organization-id> [plan-id]
 *
 * Requirements:
 *   - STRIPE_SECRET_KEY
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - STRIPE_PRICE_STARTER / STRIPE_PRICE_GROWTH / STRIPE_PRICE_IMPACT
 *   - Webhook relay running (`stripe listen --forward-to http://localhost:3000/api/stripe/webhook`)
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const [, , orgId, planIdArg] = process.argv;

if (!orgId) {
  console.error("Usage: node scripts/seed-stripe.mjs <organization-id> [plan-id]");
  process.exit(1);
}

const requiredEnvs = [
  "STRIPE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_IMPACT",
];

const missing = requiredEnvs.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const planPriceMap = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  impact: process.env.STRIPE_PRICE_IMPACT,
};

const targetPlan = (planIdArg ?? "starter").toLowerCase();
const priceId = planPriceMap[targetPlan];

if (!priceId) {
  console.error(`Unknown plan "${planIdArg ?? "starter"}". Use starter, growth, or impact.`);
  process.exit(1);
}

console.log(`Seeding Stripe for org ${orgId} with plan ${targetPlan} (${priceId})`);

const { data: org, error: orgError } = await supabase
  .from("organizations")
  .select("id, name, stripe_customer_id, plan_id")
  .eq("id", orgId)
  .maybeSingle();

if (orgError) {
  console.error("Failed to load organization:", orgError);
  process.exit(1);
}

if (!org) {
  console.error(`Organization ${orgId} not found in Supabase.`);
  process.exit(1);
}

let customerId = org.stripe_customer_id ?? null;

if (!customerId) {
  console.log("Creating Stripe customer…");
  const customer = await stripe.customers.create({
    name: org.name ?? `GrantBot Org ${orgId.slice(0, 6)}`,
    metadata: { organization_id: orgId },
  });
  customerId = customer.id;
  await supabase
    .from("organizations")
    .update({ stripe_customer_id: customerId })
    .eq("id", orgId);
  console.log(`Linked Stripe customer ${customerId} to organization.`);
}

console.log("Attaching test payment method (pm_card_visa)…");
await stripe.paymentMethods.attach("pm_card_visa", { customer: customerId });
await stripe.customers.update(customerId, {
  invoice_settings: { default_payment_method: "pm_card_visa" },
});

console.log("Creating subscription…");
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  metadata: { organization_id: orgId },
  items: [{ price: priceId }],
  payment_behavior: "default_incomplete",
  expand: ["latest_invoice.payment_intent"],
});

const latestInvoice = subscription.latest_invoice;
if (!latestInvoice) {
  console.error("Subscription created without invoice. Aborting.");
  process.exit(1);
}

console.log(`Paying invoice ${latestInvoice.id}…`);
await stripe.invoices.pay(latestInvoice.id, { payment_method: "pm_card_visa" });

console.log("Waiting for webhook to write billing_payments record…");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let attempts = 10;
let paymentRow = null;

while (attempts > 0) {
  const { data } = await supabase
    .from("billing_payments")
    .select("*")
    .eq("stripe_invoice_id", latestInvoice.id)
    .maybeSingle();

  if (data) {
    paymentRow = data;
    break;
  }

  attempts -= 1;
  await delay(2000);
}

if (!paymentRow) {
  console.warn(
    "Invoice not found in billing_payments.\n" +
      "Make sure `stripe listen --forward-to http://localhost:3000/api/stripe/webhook` is running."
  );
  console.log(`Invoice ID: ${latestInvoice.id}`);
  process.exit(1);
}

console.log("Success! Invoice written to billing_payments:");
console.table({
  invoice: paymentRow.stripe_invoice_id,
  amount: paymentRow.amount,
  status: paymentRow.status,
  paid_at: paymentRow.paid_at,
});

process.exit(0);
