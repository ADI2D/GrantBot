import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * Complete onboarding
 * Creates/updates organization or freelancer profile with all onboarding data
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

    const { accountType, data } = await request.json();

    // Get user profile to check account type
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .single();

    const userAccountType = profile?.account_type || accountType;

    if (userAccountType === "nonprofit") {
      // Create or update organization
      const { data: existingOrg } = await supabase
        .from("org_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      const orgData = {
        name: data.name,
        mission: data.mission,
        impact_summary: data.impact_summary,
        differentiator: data.differentiator,
        annual_budget: data.annual_budget ? Number(data.annual_budget) : null,
        focus_areas: data.focus_areas || [],
        ein: data.ein,
        founded_year: data.founded_year ? Number(data.founded_year) : null,
        staff_size: data.staff_size,
        geographic_scope: data.geographic_scope,
        website: data.website,
        programs: data.programs || [],
        impact_metrics: data.impact_metrics || [],
        target_demographics: data.target_demographics || [],
        past_funders: data.past_funders || [],
        document_metadata: data.documents || [],
        onboarding_completion: 100,
        created_by: user.id,
      };

      if (existingOrg) {
        // Update existing organization
        const { error: updateError } = await supabase
          .from("organizations")
          .update(orgData)
          .eq("id", existingOrg.organization_id);

        if (updateError) {
          console.error("[onboarding][complete] Org update error:", updateError);
          return NextResponse.json(
            { error: "Failed to update organization" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          organizationId: existingOrg.organization_id,
        });
      } else {
        // Create new organization
        const { data: newOrg, error: createError } = await supabase
          .from("organizations")
          .insert(orgData)
          .select()
          .single();

        if (createError) {
          console.error("[onboarding][complete] Org create error:", createError);
          return NextResponse.json(
            { error: "Failed to create organization" },
            { status: 500 }
          );
        }

        // Add user as organization member
        const { error: memberError } = await supabase
          .from("org_members")
          .insert({
            organization_id: newOrg.id,
            user_id: user.id,
            role: "owner",
          });

        if (memberError) {
          console.error("[onboarding][complete] Member create error:", memberError);
        }

        return NextResponse.json({
          success: true,
          organizationId: newOrg.id,
        });
      }
    } else if (userAccountType === "freelancer") {
      // Create or update freelancer profile
      const profileData = {
        user_id: user.id,
        full_name: data.full_name,
        headline: data.headline,
        bio: data.bio,
        hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : null,
        years_experience: data.years_experience ? Number(data.years_experience) : null,
        specializations: data.specializations || [],
        certifications: data.certifications || [],
        portfolio_items: data.portfolio_items || [],
        total_grants_written: data.total_grants_written ? Number(data.total_grants_written) : 0,
        total_amount_raised: data.total_amount_raised ? Number(data.total_amount_raised) : 0,
        success_rate: data.success_rate ? Number(data.success_rate) : null,
        availability_status: data.availability_status || "available",
        weekly_capacity: data.weekly_capacity ? Number(data.weekly_capacity) : null,
        onboarding_completion: 100,
      };

      const { error: profileError } = await supabase
        .from("freelancer_profiles")
        .upsert(profileData);

      if (profileError) {
        console.error("[onboarding][complete] Profile error:", profileError);
        return NextResponse.json(
          { error: "Failed to save freelancer profile" },
          { status: 500 }
        );
      }

      // Create client records if any
      if (data.clients && data.clients.length > 0) {
        const clientRecords = data.clients.map((client: any) => ({
          freelancer_id: user.id,
          client_name: client.client_name,
          client_type: client.client_type,
          relationship_status: client.relationship_status,
          total_raised: client.total_raised || 0,
          grants_submitted: client.grants_submitted || 0,
          grants_awarded: client.grants_awarded || 0,
          notes: client.notes,
          // Store like_us and categories in notes for now
          // In production, add these columns to freelancer_clients table
        }));

        const { error: clientsError } = await supabase
          .from("freelancer_clients")
          .insert(clientRecords);

        if (clientsError) {
          console.error("[onboarding][complete] Clients error:", clientsError);
          // Don't fail the whole onboarding if clients fail
        }
      }

      return NextResponse.json({
        success: true,
        profileCompleted: true,
      });
    }

    return NextResponse.json(
      { error: "Invalid account type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[onboarding][complete] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
