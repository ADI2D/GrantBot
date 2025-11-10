import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch client
    const { data: client, error: fetchError } = await supabase
      .from("freelancer_clients")
      .select("*")
      .eq("id", clientId)
      .eq("freelancer_user_id", user.id)
      .single();

    if (fetchError) {
      console.error("[freelancer][clients] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch client" },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error("[freelancer][clients] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
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
    const {
      name,
      primaryContactName,
      primaryContactEmail,
      mission,
      annualBudget,
      focusAreas,
      primaryFocusArea,
      focusDescription,
      billingRate,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
      return NextResponse.json({ error: "At least one focus area is required" }, { status: 400 });
    }

    if (focusAreas.length > 5) {
      return NextResponse.json({ error: "Maximum 5 focus areas allowed" }, { status: 400 });
    }

    // Validate primary focus area is in focus areas
    if (primaryFocusArea && !focusAreas.includes(primaryFocusArea)) {
      return NextResponse.json({ error: "Primary focus area must be one of the selected focus areas" }, { status: 400 });
    }

    // Update client in database
    const { data: client, error: updateError } = await supabase
      .from("freelancer_clients")
      .update({
        name,
        primary_contact_name: primaryContactName || null,
        primary_contact_email: primaryContactEmail || null,
        mission: mission || null,
        annual_budget: annualBudget || null,
        focus_areas: focusAreas,
        primary_focus_area: primaryFocusArea || focusAreas[0],
        focus_description: focusDescription || null,
        billing_rate: billingRate || null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .eq("freelancer_user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[freelancer][clients] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update client" },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error("[freelancer][clients] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete client (cascade will delete related documents, notes, and proposals)
    const { error: deleteError } = await supabase
      .from("freelancer_clients")
      .delete()
      .eq("id", clientId)
      .eq("freelancer_user_id", user.id);

    if (deleteError) {
      console.error("[freelancer][clients] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete client" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[freelancer][clients] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
