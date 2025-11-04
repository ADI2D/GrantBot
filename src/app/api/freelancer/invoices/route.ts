import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * GET /api/freelancer/invoices
 *
 * Fetches invoices for the authenticated freelancer
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

    const { data: invoices, error } = await supabase
      .from("freelancer_invoices")
      .select(`
        *,
        client:freelancer_clients(id, name)
      `)
      .eq("freelancer_user_id", user.id)
      .order("issue_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/freelancer/invoices
 *
 * Creates a new invoice from selected time entries
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
    const { timeEntryIds, clientId, issueDate, dueDate, taxRate = 0, notes } = body;

    // Validate required fields
    if (!timeEntryIds || timeEntryIds.length === 0 || !clientId || !issueDate || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the time entries to calculate totals
    const { data: timeEntries, error: entriesError } = await supabase
      .from("freelancer_time_entries")
      .select("*")
      .in("id", timeEntryIds)
      .eq("freelancer_user_id", user.id)
      .eq("client_id", clientId)
      .eq("is_invoiced", false);

    if (entriesError) {
      console.error("Error fetching time entries:", entriesError);
      return NextResponse.json(
        { error: "Failed to fetch time entries" },
        { status: 500 }
      );
    }

    if (!timeEntries || timeEntries.length === 0) {
      return NextResponse.json(
        { error: "No valid uninvoiced time entries found" },
        { status: 400 }
      );
    }

    // Calculate subtotal from time entries
    const subtotal = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.total_amount), 0);
    const taxAmount = (subtotal * parseFloat(taxRate)) / 100;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
      .rpc("generate_invoice_number", { user_id: user.id });

    if (invoiceNumberError) {
      console.error("Error generating invoice number:", invoiceNumberError);
      return NextResponse.json(
        { error: "Failed to generate invoice number" },
        { status: 500 }
      );
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("freelancer_invoices")
      .insert({
        invoice_number: invoiceNumberData,
        freelancer_user_id: user.id,
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        status: "draft",
        subtotal: subtotal.toFixed(2),
        tax_rate: parseFloat(taxRate),
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        notes: notes || null,
      })
      .select(`
        *,
        client:freelancer_clients(id, name)
      `)
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // Update time entries to mark them as invoiced
    const { error: updateError } = await supabase
      .from("freelancer_time_entries")
      .update({
        is_invoiced: true,
        invoice_id: invoice.id,
      })
      .in("id", timeEntryIds);

    if (updateError) {
      console.error("Error updating time entries:", updateError);
      // Note: Invoice is created but time entries weren't updated
      // You might want to handle this differently in production
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
