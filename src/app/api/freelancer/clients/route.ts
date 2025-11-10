import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
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

    // Fetch clients for this freelancer
    const { data: clients, error } = await supabase
      .from("freelancer_clients")
      .select("id, name, status")
      .eq("freelancer_user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("[freelancer][clients] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    return NextResponse.json({ clients: clients || [] });
  } catch (error) {
    console.error("[freelancer][clients] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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

    // Insert client into database
    const { data: client, error: insertError } = await supabase
      .from("freelancer_clients")
      .insert({
        freelancer_user_id: user.id,
        name,
        status: "active",
        primary_contact_name: primaryContactName || null,
        primary_contact_email: primaryContactEmail || null,
        mission: mission || null,
        annual_budget: annualBudget || null,
        focus_areas: focusAreas,
        primary_focus_area: primaryFocusArea || focusAreas[0], // Default to first if not provided
        focus_description: focusDescription || null,
        billing_rate: billingRate || null,
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[freelancer][clients] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create client" },
        { status: 500 }
      );
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("[freelancer][clients] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
