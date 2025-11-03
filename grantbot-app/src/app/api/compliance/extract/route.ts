import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { ComplianceExtractor } from "@/lib/compliance/extractor";

/**
 * POST /api/compliance/extract
 *
 * Extract compliance requirements from an opportunity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    // Fetch opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("id, name, compliance_notes, raw_data")
      .eq("id", opportunityId)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Extract text from raw_data if available
    let fullText = "";
    if (opportunity.raw_data) {
      const rawData = opportunity.raw_data as any;
      // Try to extract description or synopsis from raw data
      fullText = rawData.synopsis || rawData.description || rawData.opportunityTitle || "";
    }

    // Initialize extractor
    const extractor = new ComplianceExtractor(supabase);

    // Extract requirements
    const result = await extractor.extractRequirements(fullText, opportunity.compliance_notes);

    // Store requirements in database
    await extractor.storeRequirements(opportunityId, result.requirements);

    // Get summary stats
    const summary = await extractor.getSummary(opportunityId);

    return NextResponse.json({
      success: true,
      ...result,
      summary,
    });
  } catch (error) {
    console.error("Compliance extraction error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract compliance requirements",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/compliance/extract?opportunityId=xxx
 *
 * Get extracted compliance requirements for an opportunity
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get opportunityId from query params
    const opportunityId = request.nextUrl.searchParams.get("opportunityId");

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    // Initialize extractor
    const extractor = new ComplianceExtractor(supabase);

    // Get requirements
    const requirements = await extractor.getRequirements(opportunityId);
    const summary = await extractor.getSummary(opportunityId);

    return NextResponse.json({
      requirements,
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch compliance requirements:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch compliance requirements",
      },
      { status: 500 }
    );
  }
}
