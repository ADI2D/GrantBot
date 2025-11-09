import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { requireAdminRole, AdminAuthorizationError } from "@/lib/admin-auth";
import { invalidatePlanCache, invalidatePricePlanCache } from "@/lib/pricing-plans";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? null;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

function toNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return Math.round(parsed);
}

function toNullableNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return Math.round(parsed);
}

export async function GET() {
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireAdminRole(user.id, ["super_admin", "developer"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const adminClient = getServiceSupabaseClient();
  const { data, error } = await adminClient
    .from("pricing_plans")
    .select(
      "id, name, description, monthly_price_cents, max_proposals_per_month, stripe_product_id, stripe_price_id, active, created_at, updated_at",
    )
    .order("monthly_price_cents", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireAdminRole(user.id, ["super_admin"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  try {
    const payload = await request.json();
    const id = typeof payload.id === "string" && payload.id.trim().length > 0 ? payload.id.trim() : null;
    const name = typeof payload.name === "string" ? payload.name.trim() : null;
    const description = typeof payload.description === "string" ? payload.description.trim() : null;
    const monthlyPriceCents = toNumber(payload.monthlyPriceCents, "monthlyPriceCents");
    const maxProposals = toNumber(payload.maxProposalsPerMonth, "maxProposalsPerMonth");
    const seatLimit = toNullableNumber(payload.seatLimit, "seatLimit");
    const maxOpportunities = toNullableNumber(payload.maxOpportunities, "maxOpportunities");
    const maxDocuments = toNullableNumber(payload.maxDocuments, "maxDocuments");
    const allowAi = payload.allowAi !== false;
    const allowAnalytics = payload.allowAnalytics !== false;
    const active = payload.active !== false;

    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }

    let stripeProductId: string | null = payload.stripeProductId ?? null;
    let stripePriceId: string | null = payload.stripePriceId ?? null;

    if (!stripePriceId && !stripe) {
      return NextResponse.json(
        { error: "Provide stripePriceId or configure STRIPE_SECRET_KEY to auto-create prices." },
        { status: 400 },
      );
    }

    if (!stripePriceId && stripe) {
      const product = await stripe.products.create({ name, metadata: { plan_id: id } });
      const price = await stripe.prices.create({
        unit_amount: monthlyPriceCents,
        currency: "usd",
        recurring: { interval: "month" },
        product: product.id,
      });
      stripeProductId = product.id;
      stripePriceId = price.id;
    }

    const adminClient = getServiceSupabaseClient();
    const { data, error } = await adminClient
      .from("pricing_plans")
      .insert({
        id,
        name,
        description,
        monthly_price_cents: monthlyPriceCents,
        max_proposals_per_month: maxProposals,
        seat_limit: seatLimit,
        max_opportunities: maxOpportunities,
        max_documents: maxDocuments,
        allow_ai: allowAi,
        allow_analytics: allowAnalytics,
        active,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    invalidatePlanCache();
    invalidatePricePlanCache();

    return NextResponse.json({ plan: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create plan" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireAdminRole(user.id, ["super_admin"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  try {
    const payload = await request.json();
    const id = typeof payload.id === "string" ? payload.id : null;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const adminClient = getServiceSupabaseClient();
    const { data: current, error: fetchError } = await adminClient
      .from("pricing_plans")
      .select(
        "id, name, description, monthly_price_cents, max_proposals_per_month, stripe_product_id, stripe_price_id, seat_limit, max_opportunities, max_documents, allow_ai, allow_analytics",
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!current) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    const nextName =
      typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : current.name;
    const nextDescription =
      typeof payload.description === "string" && payload.description.trim() !== (current.description ?? "")
        ? payload.description.trim()
        : current.description;

    if (nextName !== current.name) {
      updates.name = nextName;
    }

    if ((nextDescription ?? null) !== (current.description ?? null)) {
      updates.description = nextDescription ?? null;
    }

    if (typeof payload.active === "boolean" && payload.active !== current.active) {
      updates.active = payload.active;
    }

    if (payload.allowAi !== undefined) {
      const nextAllowAi = Boolean(payload.allowAi);
      if (nextAllowAi !== current.allow_ai) {
        updates.allow_ai = nextAllowAi;
      }
    }

    if (payload.allowAnalytics !== undefined) {
      const nextAllowAnalytics = Boolean(payload.allowAnalytics);
      if (nextAllowAnalytics !== current.allow_analytics) {
        updates.allow_analytics = nextAllowAnalytics;
      }
    }

    if (payload.maxProposalsPerMonth !== undefined) {
      const limit = toNumber(payload.maxProposalsPerMonth, "maxProposalsPerMonth");
      if (limit !== current.max_proposals_per_month) {
        updates.max_proposals_per_month = limit;
      }
    }

    if (payload.seatLimit !== undefined) {
      const seatLimit = toNullableNumber(payload.seatLimit, "seatLimit");
      if (seatLimit !== (current.seat_limit ?? null)) {
        updates.seat_limit = seatLimit;
      }
    }

    if (payload.maxOpportunities !== undefined) {
      const maxOpps = toNullableNumber(payload.maxOpportunities, "maxOpportunities");
      if (maxOpps !== (current.max_opportunities ?? null)) {
        updates.max_opportunities = maxOpps;
      }
    }

    if (payload.maxDocuments !== undefined) {
      const maxDocs = toNullableNumber(payload.maxDocuments, "maxDocuments");
      if (maxDocs !== (current.max_documents ?? null)) {
        updates.max_documents = maxDocs;
      }
    }

    if (payload.monthlyPriceCents !== undefined) {
      const nextCents = toNumber(payload.monthlyPriceCents, "monthlyPriceCents");
      if (nextCents !== current.monthly_price_cents) {
        updates.monthly_price_cents = nextCents;
        if (payload.stripePriceId) {
          updates.stripe_price_id = payload.stripePriceId;
        } else if (stripe) {
          const productId = current.stripe_product_id
            ? current.stripe_product_id
            : (await stripe.products.create({ name: nextName, metadata: { plan_id: id } })).id;
          const price = await stripe.prices.create({
            unit_amount: nextCents,
            currency: "usd",
            recurring: { interval: "month" },
            product: productId,
          });
          updates.stripe_price_id = price.id;
          if (!current.stripe_product_id) {
            updates.stripe_product_id = productId;
          }
        } else {
          throw new Error("Provide stripePriceId when STRIPE_SECRET_KEY is not configured.");
        }
      }
    }

    if (stripe && current.stripe_product_id && (updates.name || updates.description !== undefined)) {
      await stripe.products.update(current.stripe_product_id, {
        name: updates.name ? String(updates.name) : current.name,
        description:
          updates.description === undefined
            ? current.description ?? undefined
            : (updates.description as string | null) ?? undefined,
      });
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ warning: "No changes detected" });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await adminClient
      .from("pricing_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    invalidatePlanCache();
    if (updates.stripe_price_id !== undefined || updates.active !== undefined) {
      invalidatePricePlanCache();
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update plan" },
      { status: 500 },
    );
  }
}
