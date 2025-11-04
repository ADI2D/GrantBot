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
    const {
      name,
      ein,
      mission,
      aboutUs,
      primaryContactName,
      primaryContactEmail,
      annualBudget,
      focusAreas,
      planName,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    // Insert client into database
    const { data: client, error: insertError } = await supabase
      .from("freelancer_clients")
      .insert({
        freelancer_user_id: user.id,
        name,
        ein: ein || null,
        status: "active",
        primary_contact_name: primaryContactName || null,
        primary_contact_email: primaryContactEmail || null,
        mission: mission || null,
        about_us: aboutUs || null,
        annual_budget: annualBudget || null,
        focus_areas: Array.isArray(focusAreas) ? focusAreas : [],
        plan_name: planName || null,
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
