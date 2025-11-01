import { NextRequest, NextResponse } from "next/server";
import { fetchProposalSections } from "@/lib/data-service";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await fetchProposalSections(supabase, params.id);
    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId, content } = await request.json();
    if (!sectionId) {
      return NextResponse.json({ error: "Missing sectionId" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("proposal_sections")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", sectionId);

    if (updateError) {
      throw updateError;
    }

    const { data: proposalRecord } = await supabase
      .from("proposals")
      .select("organization_id")
      .eq("id", params.id)
      .single();

    if (proposalRecord) {
      await supabase.from("activity_logs").insert({
        organization_id: proposalRecord.organization_id,
        proposal_id: params.id,
        user_id: user.id,
        action: "section_updated",
        metadata: { sectionId },
      });
    }

    const sections = await fetchProposalSections(supabase, params.id);
    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
