import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";

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

    const adminClient = getServiceSupabaseClient();

    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      throw profileError;
    }

    if ((profile?.account_type ?? "nonprofit") === "freelancer") {
      return NextResponse.json({ skipped: true });
    }

    const { organizationName } = await request.json();

    const { data: existingMembership, error: membershipError } = await adminClient
      .from("org_members")
      .select("organization_id, organizations!inner(*)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError;
    }

    if (existingMembership?.organizations) {
      return NextResponse.json({
        organization: existingMembership.organizations,
      });
    }

    const { data: defaultPlan } = await adminClient
      .from("pricing_plans")
      .select("id")
      .eq("active", true)
      .order("monthly_price_cents", { ascending: true })
      .limit(1)
      .maybeSingle();

    const defaultPlanId = defaultPlan?.id ?? "starter";

    const { data: organization, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: organizationName ?? "New Organization",
        onboarding_completion: 0,
        plan_id: defaultPlanId,
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError || !organization) {
      throw orgError ?? new Error("Failed to create organization");
    }

    const { error: memberError } = await adminClient.from("org_members").insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      throw memberError;
    }

    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
