"use server";

import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

function buildSuggestion(prompt: string): string {
  const trimmed = prompt.trim();
  const intro = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return `${intro}.\n\n• Highlight quantifiable outcomes that connect directly to the funder's priorities.\n• Add one vivid anecdote that shows community impact.\n• Close with a forward-looking statement about sustainability.`;
}

export async function POST(
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

  const prompt = typeof (payload as { prompt?: unknown })?.prompt === "string" ? (payload as { prompt: string }).prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Ensure the proposal belongs to the authenticated user (RLS handles this but we double check)
  const { data: existing, error } = await supabase
    .from("freelancer_proposals")
    .select("id")
    .eq("id", proposalId)
    .eq("freelancer_user_id", user.id)
    .maybeSingle();

  if (error || !existing) {
    return NextResponse.json(
      { error: error?.message ?? "Proposal not found" },
      { status: error?.code === "PGRST116" || !existing ? 404 : 400 },
    );
  }

  const suggestion = buildSuggestion(prompt);
  return NextResponse.json({ suggestion });
}
