import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * GET /api/freelancer/time-entries
 *
 * Fetches time entries for the authenticated freelancer with optional filters
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isInvoiced = searchParams.get("isInvoiced");

    // Build query
    let query = supabase
      .from("freelancer_time_entries")
      .select(`
        *,
        client:freelancer_clients(id, name),
        proposal:freelancer_proposals(id, title)
      `)
      .eq("freelancer_user_id", user.id)
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    // Apply filters
    if (clientId) {
      query = query.eq("client_id", clientId);
    }
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    if (isInvoiced !== null && isInvoiced !== undefined) {
      query = query.eq("is_invoiced", isInvoiced === "true");
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error("Error fetching time entries:", error);
      return NextResponse.json(
        { error: "Failed to fetch time entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/freelancer/time-entries
 *
 * Creates a new time entry
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

    const body = await request.json();
    const { clientId, proposalId, date, timeIn, timeOut, billableRate, notes } = body;

    // Validate required fields
    if (!clientId || !date || !timeIn || !timeOut || !billableRate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate time_out is after time_in
    if (timeOut <= timeIn) {
      return NextResponse.json(
        { error: "Time out must be after time in" },
        { status: 400 }
      );
    }

    // Insert time entry
    const { data: entry, error: insertError } = await supabase
      .from("freelancer_time_entries")
      .insert({
        freelancer_user_id: user.id,
        client_id: clientId,
        proposal_id: proposalId || null,
        date,
        time_in: timeIn,
        time_out: timeOut,
        billable_rate: billableRate,
        notes: notes || null,
      })
      .select(`
        *,
        client:freelancer_clients(id, name),
        proposal:freelancer_proposals(id, title)
      `)
      .single();

    if (insertError) {
      console.error("Error creating time entry:", insertError);
      return NextResponse.json(
        { error: "Failed to create time entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
