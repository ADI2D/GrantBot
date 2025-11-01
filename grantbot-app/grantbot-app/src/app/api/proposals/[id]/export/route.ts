import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { generateProposalPDF } from "@/lib/export-pdf";
import { generateProposalDOCX } from "@/lib/export-docx";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    const format = request.nextUrl.searchParams.get("format") || "pdf"; // pdf or docx

    if (!["pdf", "docx"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Use 'pdf' or 'docx'" }, { status: 400 });
    }

    // Fetch proposal with sections
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        id,
        organization_id,
        opportunity_id,
        owner_name,
        status,
        created_at,
        opportunities (
          name
        )
      `)
      .eq("id", id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Verify user has access to this proposal's org
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("organization_id", proposal.organization_id)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", proposal.organization_id)
      .single();

    // Get sections
    const { data: sections } = await supabase
      .from("proposal_sections")
      .select("title, content")
      .eq("proposal_id", id)
      .order("id", { ascending: true });

    // Prepare data for export
    const exportData = {
      organizationName: org?.name || "Organization",
      opportunityName: proposal.opportunities?.name || "Grant Opportunity",
      sections: sections || [],
      metadata: {
        createdAt: proposal.created_at,
        ownerName: proposal.owner_name || undefined,
        status: proposal.status,
      },
    };

    // Generate document
    let blob: Blob;
    let filename: string;
    let mimeType: string;

    if (format === "pdf") {
      blob = generateProposalPDF(exportData);
      filename = `proposal-${id}.pdf`;
      mimeType = "application/pdf";
    } else {
      blob = await generateProposalDOCX(exportData);
      filename = `proposal-${id}.docx`;
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      organization_id: proposal.organization_id,
      proposal_id: id,
      user_id: session.user.id,
      action: "proposal_exported",
      metadata: { format, filename },
    });

    // Convert blob to buffer for response
    const buffer = await blob.arrayBuffer();

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[proposals][export][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
