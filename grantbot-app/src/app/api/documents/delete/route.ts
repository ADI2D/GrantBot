import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const { filePath, title } = await request.json();

    if (!filePath && !title) {
      return NextResponse.json(
        { error: "Either filePath or title must be provided" },
        { status: 400 }
      );
    }

    // Verify user is a member of this org
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    // Get current documents
    const { data: org } = await supabase
      .from("organizations")
      .select("document_metadata")
      .eq("id", orgId)
      .single();

    const existingDocs = (org?.document_metadata as Record<string, unknown>[]) || [];

    // Find and remove the document
    const docToDelete = existingDocs.find((doc: Record<string, unknown>) =>
      filePath ? doc.filePath === filePath : doc.title === title
    );

    if (!docToDelete) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updatedDocs = existingDocs.filter((doc: Record<string, unknown>) =>
      filePath ? doc.filePath !== filePath : doc.title !== title
    );

    // Delete from storage if filePath exists
    if (docToDelete.filePath) {
      const { error: storageError } = await supabase.storage
        .from("org-documents")
        .remove([docToDelete.filePath as string]);

      if (storageError) {
        console.error("[documents][delete][storage-error]", storageError);
        // Continue anyway - metadata should still be removed
      }
    }

    // Update organization document_metadata
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ document_metadata: updatedDocs })
      .eq("id", orgId);

    if (updateError) {
      throw updateError;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      user_id: user.id,
      action: "document_deleted",
      metadata: { title: docToDelete.title, fileName: docToDelete.fileName },
    });

    return NextResponse.json({
      message: "Document deleted successfully",
      deletedDocument: docToDelete,
    });
  } catch (error) {
    console.error("[documents][delete][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
