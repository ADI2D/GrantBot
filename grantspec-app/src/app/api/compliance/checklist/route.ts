import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { ChecklistGenerator } from "@/lib/compliance/checklist-generator";

/**
 * POST /api/compliance/checklist
 *
 * Generate checklist for a proposal from opportunity requirements
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
    const { proposalId, opportunityId } = body;

    if (!proposalId || !opportunityId) {
      return NextResponse.json(
        { error: "proposalId and opportunityId are required" },
        { status: 400 }
      );
    }

    // Initialize generator
    const generator = new ChecklistGenerator(supabase);

    // Generate and populate checklist
    await generator.populateProposalCompliance(proposalId, opportunityId);

    // Get completion stats
    const stats = await generator.getCompletionStats(proposalId);

    // Fetch updated proposal
    const { data: proposal } = await supabase
      .from("proposals")
      .select("compliance_summary, checklist_status")
      .eq("id", proposalId)
      .single();

    return NextResponse.json({
      success: true,
      compliance_summary: proposal?.compliance_summary || [],
      checklist_status: proposal?.checklist_status || "in_progress",
      stats,
    });
  } catch (error) {
    console.error("Checklist generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate checklist",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/compliance/checklist?proposalId=xxx
 *
 * Get checklist and stats for a proposal
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

    // Get proposalId from query params
    const proposalId = request.nextUrl.searchParams.get("proposalId");

    if (!proposalId) {
      return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
    }

    // Initialize generator
    const generator = new ChecklistGenerator(supabase);

    // Get completion stats
    const stats = await generator.getCompletionStats(proposalId);

    // Fetch proposal checklist
    const { data: proposal } = await supabase
      .from("proposals")
      .select("compliance_summary, checklist_status")
      .eq("id", proposalId)
      .single();

    return NextResponse.json({
      compliance_summary: proposal?.compliance_summary || [],
      checklist_status: proposal?.checklist_status || "in_progress",
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch checklist:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch checklist",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/compliance/checklist
 *
 * Update checklist item status
 */
export async function PATCH(request: NextRequest) {
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
    const { proposalId, sectionIndex, itemIndex, status } = body;

    if (
      !proposalId ||
      sectionIndex === undefined ||
      itemIndex === undefined ||
      !status
    ) {
      return NextResponse.json(
        { error: "proposalId, sectionIndex, itemIndex, and status are required" },
        { status: 400 }
      );
    }

    if (!["complete", "flag", "missing"].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: complete, flag, missing' },
        { status: 400 }
      );
    }

    // Initialize generator
    const generator = new ChecklistGenerator(supabase);

    // Update item status
    await generator.updateItemStatus(proposalId, sectionIndex, itemIndex, status);

    // Get updated stats
    const stats = await generator.getCompletionStats(proposalId);

    // Fetch updated proposal
    const { data: proposal } = await supabase
      .from("proposals")
      .select("compliance_summary, checklist_status")
      .eq("id", proposalId)
      .single();

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      proposal_id: proposalId,
      action: "compliance_updated",
      metadata: {
        sectionIndex,
        itemIndex,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      compliance_summary: proposal?.compliance_summary || [],
      checklist_status: proposal?.checklist_status || "in_progress",
      stats,
    });
  } catch (error) {
    console.error("Failed to update checklist item:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update checklist item",
      },
      { status: 500 }
    );
  }
}
