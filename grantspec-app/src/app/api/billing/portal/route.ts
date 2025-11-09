import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
const portalReturnUrl = process.env.APP_URL ?? "http://localhost:3000/billing";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const { data: organization } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", orgId)
      .single();

    if (!organization?.stripe_customer_id) {
      return NextResponse.json({ error: "Customer not linked" }, { status: 400 });
    }

    if (!stripeSecret) {
      return NextResponse.json({ url: portalReturnUrl, warning: "Stripe secret not configured." });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
    const sessionPortal = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: portalReturnUrl,
    });

    return NextResponse.json({ url: sessionPortal.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
