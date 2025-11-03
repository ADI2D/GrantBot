import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

type RouteParams = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { id } = await params;
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { error } = await supabase
      .from("proposals")
      .update({ compliance_summary: payload.compliance })
      .eq("id", id);

    if (error) {
      throw error;
    }

    const { data: proposalRecord } = await supabase
      .from("proposals")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (proposalRecord) {
      await supabase.from("activity_logs").insert({
        organization_id: proposalRecord.organization_id,
        proposal_id: id,
        user_id: user.id,
        action: "compliance_updated",
        metadata: { items: payload.compliance },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
