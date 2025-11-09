import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { clientId, content } = body;

    // Validate required fields
    if (!clientId || !content) {
      return NextResponse.json(
        { error: "Client ID and note content are required" },
        { status: 400 }
      );
    }

    // Verify client belongs to this freelancer
    const { data: client } = await supabase
      .from("freelancer_clients")
      .select("id")
      .eq("id", clientId)
      .eq("freelancer_user_id", user.id)
      .maybeSingle();

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Insert note into database
    const { data: note, error: insertError } = await supabase
      .from("freelancer_notes")
      .insert({
        freelancer_user_id: user.id,
        client_id: clientId,
        content,
        note_type: "general", // Default to general, can be extended later
      })
      .select()
      .single();

    if (insertError) {
      console.error("[freelancer][notes] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("[freelancer][notes] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
