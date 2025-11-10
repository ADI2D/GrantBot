import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { calculateMatchScore, type ClientProfile, type GrantOpportunity } from "@/lib/match-scoring";
import { getAllFocusAreaSearchValues, type FocusAreaId } from "@/types/focus-areas";

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

    // If clientId is provided, fetch client details to get focus areas
    let clientFocusAreasFromDb: string[] = [];
    let clientNameFromDb: string | undefined;
    let clientMissionFromDb: string | undefined;

    if (clientId) {
      const { data: clientData, error: clientError } = await supabase
        .from("freelancer_clients")
        .select("focus_areas, name, mission")
        .eq("id", clientId)
        .eq("freelancer_user_id", user.id)
        .single();

      if (!clientError && clientData) {
        clientFocusAreasFromDb = clientData.focus_areas || [];
        clientNameFromDb = clientData.name;
        clientMissionFromDb = clientData.mission;
        console.log(`[freelancer][opportunities] Client ${clientId} focus areas:`, clientFocusAreasFromDb);
      } else {
        console.log(`[freelancer][opportunities] Could not fetch client ${clientId}:`, clientError?.message);
      }
    }

    // Determine which focus areas to use for filtering
    const focusAreasToFilter = clientFocusAreasFromDb.length > 0
      ? clientFocusAreasFromDb
      : (clientFocusAreas.length > 0 ? clientFocusAreas : []);

    // Convert focus area IDs to ALL possible database values (labels, abbreviations, variations)
    // This handles mixed data quality in the opportunities table
    const focusAreaLabelsToFilter = focusAreasToFilter.length > 0
      ? getAllFocusAreaSearchValues(focusAreasToFilter as FocusAreaId[])
      : [];

    // Build client profile for AI matching
    const clientProfile: ClientProfile | null = (clientName || clientNameFromDb) ? {
      name: clientName || clientNameFromDb || "",
      mission: clientMission || clientMissionFromDb || undefined,
      focusAreas: focusAreasToFilter.length > 0 ? focusAreasToFilter : undefined,
    } : null;

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
    // Prioritize client focus areas from database, then explicit focus area filter
    if (focusAreaLabelsToFilter.length > 0) {
      // Filter opportunities where focus_area matches ANY of the client's focus areas
      // Use display labels (e.g., "Education") since that's what opportunities table stores
      query = query.in("focus_area", focusAreaLabelsToFilter);
      console.log(`[freelancer][opportunities] Filtering by client focus area labels:`, focusAreaLabelsToFilter);
    } else if (focusArea) {
      // Explicit focus area filter from UI
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
