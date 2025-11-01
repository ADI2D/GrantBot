import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { fetchOrganization } from "@/lib/data-service";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
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
    const organization = await fetchOrganization(supabase, orgId);
    return NextResponse.json({ organization });
  } catch (error) {
    console.error("[organization][GET][error]", error);
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
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const payload = await request.json();

    const annualBudget = payload.budget
      ? Number(String(payload.budget).replace(/[^0-9.]/g, "")) || null
      : null;

    const { error } = await supabase
      .from("organizations")
      .update({
        name: payload.organizationName,
        mission: payload.mission,
        impact_summary: payload.impact,
        differentiator: payload.differentiator,
        annual_budget: annualBudget,
        document_metadata: payload.documents ?? [],
      })
      .eq("id", orgId);

    if (error) {
      throw error;
    }

    const organization = await fetchOrganization(supabase, orgId);
    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
