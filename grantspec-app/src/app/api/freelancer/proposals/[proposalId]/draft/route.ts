"use server";

import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export async function PATCH(
  request: NextRequest,
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

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { draftHtml, checklist } = payload as {
    draftHtml?: unknown;
    checklist?: unknown;
  };

  if (typeof draftHtml !== "string") {
    return NextResponse.json({ error: "draftHtml must be a string" }, { status: 400 });
  }

  let normalizedChecklist: ChecklistItem[] | undefined;
  if (Array.isArray(checklist)) {
    normalizedChecklist = checklist
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id = typeof (item as ChecklistItem).id === "string" ? (item as ChecklistItem).id : "";
        const label = typeof (item as ChecklistItem).label === "string" ? (item as ChecklistItem).label : "";
        const completed =
          typeof (item as ChecklistItem).completed === "boolean" ? (item as ChecklistItem).completed : false;
        if (!id || !label) return null;
        return { id, label, completed };
      })
      .filter((item): item is ChecklistItem => item !== null);
  }

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("freelancer_proposals")
    .update({
      draft_html: draftHtml,
      checklist: normalizedChecklist ?? checklist,
      last_edited_at: timestamp,
    })
    .eq("id", proposalId)
    .eq("freelancer_user_id", user.id)
    .select("last_edited_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save proposal draft" },
      { status: error?.code === "PGRST116" ? 404 : 400 },
    );
  }

  return NextResponse.json({ success: true, lastEditedAt: data.last_edited_at ?? timestamp });
}
