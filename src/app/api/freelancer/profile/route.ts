import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * Get freelancer profile with all onboarding data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch freelancer profile
    const { data: profile, error: profileError } = await supabase
      .from("freelancer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[freelancer][profile] Fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch freelancer profile" },
        { status: 500 }
      );
    }

    // Fetch freelancer clients with like_us and categories
    const { data: clients, error: clientsError } = await supabase
      .from("freelancer_clients")
      .select("id, name, like_us, categories")
      .eq("freelancer_user_id", user.id);

    if (clientsError) {
      console.error("[freelancer][clients] Fetch error:", clientsError);
      // Don't fail if clients fetch fails, just return empty array
    }

    return NextResponse.json({
      profile: profile || null,
      clients: clients || [],
    });
  } catch (error) {
    console.error("[freelancer][profile] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
