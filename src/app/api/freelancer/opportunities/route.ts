import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { calculateMatchScore, type ClientProfile, type GrantOpportunity } from "@/lib/match-scoring";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const focusAreasParam = searchParams.get("focusAreas");
    const focusAreas = focusAreasParam ? focusAreasParam.split(",").filter(Boolean) : [];
    const status = searchParams.get("status") || "";
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const clientId = searchParams.get("clientId");
    const geographicScope = searchParams.get("geographicScope");
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 1000;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

    // Get client profile parameters for AI matching
    const enableMatching = searchParams.get("enableMatching") === "true";
    const clientName = searchParams.get("clientName");
    const clientMission = searchParams.get("clientMission");
    const clientFocusAreas = searchParams.get("clientFocusAreas")?.split(",").filter(Boolean) || [];

    const clientProfile: ClientProfile | null = clientName ? {
      name: clientName,
      mission: clientMission || undefined,
      focusAreas: clientFocusAreas.length > 0 ? clientFocusAreas : undefined,
    } : null;

    // Fetch client focus areas if clientId provided (for client-specific filtering)
    let dbClientFocusAreas: string[] = [];
    if (clientId) {
      const { data: clientData } = await supabase
        .from("freelancer_clients")
        .select("focus_areas")
        .eq("id", clientId)
        .single();

      if (clientData?.focus_areas) {
        dbClientFocusAreas = clientData.focus_areas;
      }
    }

    // Base query - get public opportunities only (organization_id IS NULL)
    // Show opportunities from past 60 days OR future OR ongoing (no deadline)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

    let query = supabase
      .from("opportunities")
      .select(
        `id, name, focus_area, focus_areas, funder_name, amount, deadline, alignment_score, status, compliance_notes, application_url, geographic_scope,
        bookmarked_opportunities!left(id)`
      )
      .is("organization_id", null) // Only public opportunities for freelancers
      .or(`deadline.gte.${sixtyDaysAgoStr},deadline.is.null`) // Past 60 days + future + ongoing
      .neq("status", "closed")
      .order("deadline", { ascending: true, nullsFirst: false }); // Soonest deadlines first

    // Filter by client focus areas if clientId provided (show opportunities that overlap with client's focus areas)
    if (clientId && dbClientFocusAreas.length > 0) {
      query = query.overlaps("focus_areas", dbClientFocusAreas);
    }

    // Apply filters
    // Support multiple focus areas with AND logic using the focus_areas array field
    // If user selects [International, Education], show only opportunities that have BOTH
    if (focusAreas.length > 0) {
      query = query.contains("focus_areas", focusAreas);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (minAmount) {
      query = query.gte("amount", parseInt(minAmount));
    }

    if (maxAmount) {
      query = query.lte("amount", parseInt(maxAmount));
    }

    if (geographicScope) {
      query = query.ilike("geographic_scope", `%${geographicScope}%`);
    }

    // Apply full-text search if query provided
    if (search && search.trim()) {
      query = query.textSearch("search_vector", search, {
        type: "websearch",
        config: "english",
      });
    }

    // Apply pagination
    query = query.limit(limit);
    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[freelancer][opportunities] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch opportunities" },
        { status: 500 }
      );
    }

    // Transform data and optionally calculate AI match scores
    const opportunities = await Promise.all(
      (data ?? []).map(async (opp) => {
        let alignmentScore = opp.alignment_score || 0;
        let matchReason = null;

        // Calculate AI-powered match score if client profile provided and enabled
        if (enableMatching && clientProfile) {
          try {
            const grantOpp: GrantOpportunity = {
              name: opp.name,
              funderName: opp.funder_name || "Unknown",
              focusArea: opp.focus_area,
              amount: opp.amount,
              deadline: opp.deadline,
              complianceNotes: opp.compliance_notes,
              geographicScope: opp.geographic_scope,
            };

            const matchResult = await calculateMatchScore(clientProfile, grantOpp);
            alignmentScore = matchResult.score;
            matchReason = matchResult.reasoning;
          } catch (error) {
            console.error(`Error calculating match for ${opp.id}:`, error);
            // Fall back to database score
          }
        }

        return {
          id: opp.id,
          name: opp.name,
          funderName: opp.funder_name,
          amount: opp.amount || 0,
          deadline: opp.deadline,
          alignmentScore,
          status: opp.status || "Open",
          summary: opp.compliance_notes || "",
          focusAreas: (opp as any).focus_areas || (opp.focus_area ? [opp.focus_area] : []), // Use array field, fallback to legacy
          clientIds: [], // Populated client-side based on filters
          matchReason,
          applicationUrl: opp.application_url,
          geographicScope: opp.geographic_scope,
          isBookmarked: Array.isArray((opp as any).bookmarked_opportunities) && (opp as any).bookmarked_opportunities.length > 0,
        };
      })
    );

    console.log(`[freelancer][opportunities] Returned ${opportunities.length} opportunities (requested limit: ${limit})`);

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error("[freelancer][opportunities] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
