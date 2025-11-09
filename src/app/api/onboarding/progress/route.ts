import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * Save onboarding progress
 * Stores partial onboarding data for resuming later
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountType, step, data, completion } = await request.json();

    // Store progress in user_profiles metadata or separate table
    // For now, we'll store in user metadata
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        onboarding_progress: {
          step,
          data,
          completion,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[onboarding][progress] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Progress saved",
    });
  } catch (error) {
    console.error("[onboarding][progress] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get onboarding progress
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

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("onboarding_progress")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("[onboarding][progress] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      progress: profile?.onboarding_progress || null,
    });
  } catch (error) {
    console.error("[onboarding][progress] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
