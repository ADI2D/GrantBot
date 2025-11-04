import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

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
    const { clientId, title, opportunityId, dueDate } = body;

    // Validate required fields
    if (!clientId || !title) {
      return NextResponse.json(
        { error: "Client ID and proposal title are required" },
        { status: 400 }
      );
    }

    // Verify client belongs to this freelancer
    const { data: client, error: clientError } = await supabase
      .from("freelancer_clients")
      .select("id, name")
      .eq("id", clientId)
      .eq("freelancer_user_id", user.id)
      .maybeSingle();

    if (!client) {
      console.error("[freelancer][proposals] Client lookup failed:", {
        clientId,
        userId: user.id,
        error: clientError,
      });
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Generate a unique proposal ID
    const proposalId = `prop-${nanoid(12)}`;

    // Insert proposal into database
    const { data: proposal, error: insertError } = await supabase
      .from("freelancer_proposals")
      .insert({
        id: proposalId,
        freelancer_user_id: user.id,
        client_id: clientId,
        client_name: client.name,
        title,
        status: "Drafting",
        due_date: dueDate || null,
        owner_name: null,
        draft_html: "",
        checklist: [],
        sections: [],
        ai_prompts: [],
        last_edited_at: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[freelancer][proposals] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create proposal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error("[freelancer][proposals] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
