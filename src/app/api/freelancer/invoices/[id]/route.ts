import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * GET /api/freelancer/invoices/[id]
 *
 * Fetches a single invoice with its time entries
 */
export async function GET(
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

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("freelancer_invoices")
      .select(`
        *,
        client:freelancer_clients(id, name, primary_contact_name, primary_contact_email, ein, about_us)
      `)
      .eq("id", id)
      .eq("freelancer_user_id", user.id)
      .single();

    if (invoiceError) {
      console.error("Error fetching invoice:", invoiceError);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Fetch time entries for this invoice
    const { data: timeEntries, error: entriesError } = await supabase
      .from("freelancer_time_entries")
      .select(`
        *,
        proposal:freelancer_proposals(id, title)
      `)
      .eq("invoice_id", id)
      .order("date", { ascending: true });

    if (entriesError) {
      console.error("Error fetching time entries:", entriesError);
    }

    return NextResponse.json({
      invoice,
      timeEntries: timeEntries || [],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/freelancer/invoices/[id]
 *
 * Updates invoice status or other fields
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
    const { status, paidAmount, paidAt } = body;

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (paidAmount !== undefined) {
      updateData.paid_amount = paidAmount;
    }

    if (paidAt !== undefined) {
      updateData.paid_at = paidAt;
    }

    // Update invoice
    const { data: invoice, error: updateError } = await supabase
      .from("freelancer_invoices")
      .update(updateData)
      .eq("id", id)
      .eq("freelancer_user_id", user.id)
      .select(`
        *,
        client:freelancer_clients(id, name)
      `)
      .single();

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
