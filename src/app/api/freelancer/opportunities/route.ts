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
    const focusArea = searchParams.get("focusArea") || "";
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

    // If filtering by clientId, fetch the client's focus areas
    let clientFilterFocusAreas: string[] = [];
    if (clientId) {
      const { data: clientData, error: clientError } = await supabase
        .from("freelancer_clients")
        .select("focus_areas")
        .eq("id", clientId)
        .eq("freelancer_user_id", user.id)
        .maybeSingle();

      if (clientError) {
        console.error("[freelancer][opportunities] Failed to fetch client focus areas:", clientError);
      } else if (clientData && Array.isArray(clientData.focus_areas)) {
        clientFilterFocusAreas = clientData.focus_areas;
      }
    }

    // Base query - get all opportunities (not org-specific for freelancers)
    // Show opportunities from past 60 days OR future
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

    let query = supabase
      .from("opportunities")
      .select(
        `id, name, focus_area, funder_name, amount, deadline, alignment_score, status, compliance_notes, application_url, geographic_scope,
        bookmarked_opportunities!left(id)`
      )
      .gte("deadline", sixtyDaysAgoStr)
      .neq("status", "closed")
      .order("deadline", { ascending: false });

    // Apply filters
    // Filter by client's focus areas if clientId provided
    if (clientId && clientFilterFocusAreas.length > 0) {
      query = query.in("focus_area", clientFilterFocusAreas);
    }

    if (focusArea) {
      query = query.eq("focus_area", focusArea);
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
          focusAreas: opp.focus_area ? [opp.focus_area] : [],
          clientIds: [], // Populated client-side based on filters
          matchReason,
          applicationUrl: opp.application_url,
          geographicScope: opp.geographic_scope,
          isBookmarked: Array.isArray((opp as any).bookmarked_opportunities) && (opp as any).bookmarked_opportunities.length > 0,
        };
      })
    );

    // Sort opportunities: "other" category last, all other categories first
    // Within each group, sort by deadline (descending - furthest deadline first)
    const sortedOpportunities = opportunities.sort((a, b) => {
      const aFocusArea = a.focusAreas[0]?.toLowerCase() || "";
      const bFocusArea = b.focusAreas[0]?.toLowerCase() || "";
      const aIsOther = aFocusArea === "other";
      const bIsOther = bFocusArea === "other";

      // If one is "other" and the other isn't, non-"other" comes first
      if (aIsOther && !bIsOther) return 1;
      if (!aIsOther && bIsOther) return -1;

      // If both are "other" or both are not "other", sort by deadline
      const aDeadline = new Date(a.deadline).getTime();
      const bDeadline = new Date(b.deadline).getTime();
      return bDeadline - aDeadline; // Descending order (furthest deadline first)
    });

    console.log(`[freelancer][opportunities] Returned ${sortedOpportunities.length} opportunities (requested limit: ${limit})`);

    return NextResponse.json({ opportunities: sortedOpportunities });
  } catch (error) {
    console.error("[freelancer][opportunities] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
