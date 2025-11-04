import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * POST /api/freelancer/opportunities/analyze-document
 *
 * Analyzes an uploaded grant document (PDF, Word) for freelancers using AI to extract details.
 * Accepts a file upload and title via multipart/form-data.
 *
 * Form data:
 * - title: string (Opportunity title)
 * - file: File (PDF or Word document)
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

    // Parse form data
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and Word documents are supported" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // TODO: Implement AI-powered document analysis
    // This is a placeholder that simulates the AI analysis
    // In production, this would:
    // 1. Upload file to storage (Supabase Storage)
    // 2. Extract text from PDF/Word document
    // 3. Use Claude API to extract grant details
    // 4. Calculate alignment score based on freelancer's client profiles
    // 5. Extract compliance requirements
    // 6. Store in database

    // For now, return a mock response
    const mockOpportunity = {
      name: title,
      funderName: "Document Source",
      amount: 150000,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 90 days from now
      alignmentScore: 80,
      status: "new",
      complianceNotes: `Extracted from uploaded document: ${file.name}. Please review for accuracy.`,
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
    console.error("Error analyzing document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
