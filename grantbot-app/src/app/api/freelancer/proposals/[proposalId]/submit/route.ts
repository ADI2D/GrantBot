"use server";

import { NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await params;
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("freelancer_proposals")
    .update({
      status: "In review",
      submitted_at: timestamp,
      last_edited_at: timestamp,
    })
    .eq("id", proposalId)
    .eq("freelancer_user_id", user.id)
    .select("status, last_edited_at, submitted_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to submit proposal" },
      { status: error?.code === "PGRST116" ? 404 : 400 },
    );
  }

  return NextResponse.json({
    success: true,
    status: data.status,
    lastEditedAt: data.last_edited_at ?? timestamp,
    submittedAt: data.submitted_at ?? timestamp,
  });
}
