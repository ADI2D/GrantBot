import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * POST /api/freelancer/opportunities/analyze-url
 *
 * Analyzes grant opportunity URL(s) for freelancers using AI to extract details.
 * Accepts an array of URLs and a title in the request body.
 *
 * Request body:
 * {
 *   title: string  // Opportunity title
 *   urls: string[]  // Array of URLs to analyze
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   opportunityId?: string
 *   alignmentScore?: number
 *   name?: string
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, urls } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "URLs array is required" },
        { status: 400 }
      );
    }

    // Validate URLs
    const validUrls = urls.filter((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided" },
        { status: 400 }
      );
    }

    // TODO: Implement AI-powered URL analysis
    // This is a placeholder that simulates the AI analysis
    // In production, this would:
    // 1. Fetch content from all URLs
    // 2. Use Claude API to extract grant details
    // 3. Calculate alignment score based on freelancer's client profiles
    // 4. Extract compliance requirements
    // 5. Store in database

    // For now, return a mock response
    const mockOpportunity = {
      name: title,
      funderName: "External Funder",
      amount: 100000,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 90 days from now
      alignmentScore: 75,
      status: "new",
      complianceNotes: "Extracted from provided URLs. Please review for accuracy.",
      applicationUrl: validUrls[0],
      focusArea: "General",
    };

    // Insert into database (without organization_id for freelancers)
    const { data: opportunity, error: insertError } = await supabase
      .from("opportunities")
      .insert({
        organization_id: null, // Freelancer opportunities are not org-specific
        name: mockOpportunity.name,
        funder_name: mockOpportunity.funderName,
        amount: mockOpportunity.amount,
        deadline: mockOpportunity.deadline,
        alignment_score: mockOpportunity.alignmentScore,
        status: mockOpportunity.status,
        compliance_notes: mockOpportunity.complianceNotes,
        application_url: mockOpportunity.applicationUrl,
        focus_area: mockOpportunity.focusArea,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting opportunity:", insertError);
      return NextResponse.json(
        { error: "Failed to save opportunity" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      opportunityId: opportunity.id,
      alignmentScore: mockOpportunity.alignmentScore,
      name: mockOpportunity.name,
    });
  } catch (error) {
    console.error("Error analyzing URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
