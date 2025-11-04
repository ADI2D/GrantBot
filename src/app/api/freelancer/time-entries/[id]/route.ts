import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * PATCH /api/freelancer/time-entries/[id]
 *
 * Updates a time entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (clientId !== undefined) updates.client_id = clientId;
    if (proposalId !== undefined) updates.proposal_id = proposalId;
    if (date !== undefined) updates.date = date;
    if (timeIn !== undefined) updates.time_in = timeIn;
    if (timeOut !== undefined) updates.time_out = timeOut;
    if (billableRate !== undefined) updates.billable_rate = billableRate;
    if (notes !== undefined) updates.notes = notes;

    // Validate time_out is after time_in if both are provided
    const finalTimeIn = timeIn !== undefined ? timeIn : undefined;
    const finalTimeOut = timeOut !== undefined ? timeOut : undefined;

    if (finalTimeIn && finalTimeOut && finalTimeOut <= finalTimeIn) {
      return NextResponse.json(
        { error: "Time out must be after time in" },
        { status: 400 }
      );
    }

    // Update time entry
    const { data: entry, error: updateError } = await supabase
      .from("freelancer_time_entries")
      .update(updates)
      .eq("id", id)
      .eq("freelancer_user_id", user.id) // Ensure user owns this entry
      .select(`
        *,
        client:freelancer_clients(id, name),
        proposal:freelancer_proposals(id, title)
      `)
      .single();

    if (updateError) {
      console.error("Error updating time entry:", updateError);
      return NextResponse.json(
        { error: "Failed to update time entry" },
        { status: 500 }
      );
    }

    if (!entry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/freelancer/time-entries/[id]
 *
 * Deletes a time entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if entry is already invoiced
    const { data: entry } = await supabase
      .from("freelancer_time_entries")
      .select("is_invoiced")
      .eq("id", id)
      .eq("freelancer_user_id", user.id)
      .single();

    if (!entry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    if (entry.is_invoiced) {
      return NextResponse.json(
        { error: "Cannot delete invoiced time entry" },
        { status: 400 }
      );
    }

    // Delete time entry
    const { error: deleteError } = await supabase
      .from("freelancer_time_entries")
      .delete()
      .eq("id", id)
      .eq("freelancer_user_id", user.id);

    if (deleteError) {
      console.error("Error deleting time entry:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete time entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
