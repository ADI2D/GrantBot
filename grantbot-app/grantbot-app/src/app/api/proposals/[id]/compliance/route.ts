import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const { error } = await supabase
      .from("proposals")
      .update({ compliance_summary: payload.compliance })
      .eq("id", params.id);

    if (error) {
      throw error;
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
        user_id: session.user.id,
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
