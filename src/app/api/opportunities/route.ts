import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { fetchOpportunities, type OpportunityFilters } from "@/lib/data-service";
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

    // Parse filter parameters from query string
    const focusAreasParam = request.nextUrl.searchParams.get("focusAreas");
    const showClosedParam = request.nextUrl.searchParams.get("showClosed");
    const filters: OpportunityFilters = {
      search: request.nextUrl.searchParams.get("search") || undefined,
      focusArea: request.nextUrl.searchParams.get("focusArea") || undefined,
      focusAreas: focusAreasParam ? focusAreasParam.split(",") : undefined,
      minAmount: request.nextUrl.searchParams.get("minAmount")
        ? Number(request.nextUrl.searchParams.get("minAmount"))
        : undefined,
      maxAmount: request.nextUrl.searchParams.get("maxAmount")
        ? Number(request.nextUrl.searchParams.get("maxAmount"))
        : undefined,
      minDeadline: request.nextUrl.searchParams.get("minDeadline") || undefined,
      maxDeadline: request.nextUrl.searchParams.get("maxDeadline") || undefined,
      geographicScope: request.nextUrl.searchParams.get("geographicScope") || undefined,
      showClosed: showClosedParam === "true",
      limit: request.nextUrl.searchParams.get("limit")
        ? Number(request.nextUrl.searchParams.get("limit"))
        : undefined,
      offset: request.nextUrl.searchParams.get("offset")
        ? Number(request.nextUrl.searchParams.get("offset"))
        : undefined,
    };

    const { opportunities, totalCount } = await fetchOpportunities(supabase, orgId, filters);
    return NextResponse.json({ opportunities, totalCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
