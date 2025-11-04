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
    const { clientId, name, status, fileName, fileSize, mimeType } = body;

    // Validate required fields
    if (!clientId || !name) {
      return NextResponse.json(
        { error: "Client ID and document name are required" },
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

    // Insert document into database
    const { data: document, error: insertError } = await supabase
      .from("freelancer_documents")
      .insert({
        freelancer_user_id: user.id,
        client_id: clientId,
        name,
        status: status || "ready",
        file_path: null, // TODO: Add actual file upload to Supabase Storage
        file_size: fileSize || null,
        mime_type: mimeType || null,
        notes: fileName ? `Original filename: ${fileName}` : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[freelancer][documents] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("[freelancer][documents] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
