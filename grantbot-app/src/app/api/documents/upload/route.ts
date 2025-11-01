import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/csv',
  'text/plain',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));

    // Verify user is a member of this org
    const { data: membership } = await supabase
      .from("org_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string || file?.name || "Untitled";
    const status = formData.get("status") as string || "Ready";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    // Generate unique filename: timestamp_originalname
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const filePath = `${orgId}/${fileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("org-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[documents][upload][storage-error]", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL (even though bucket is private, this is the reference path)
    const { data: urlData } = supabase.storage
      .from("org-documents")
      .getPublicUrl(filePath);

    // Update organization document_metadata
    const { data: org, error: fetchError } = await supabase
      .from("organizations")
      .select("document_metadata")
      .eq("id", orgId)
      .single();

    if (fetchError) {
      console.error("[documents][upload][fetch-org-error]", fetchError);
      await supabase.storage.from("org-documents").remove([filePath]);
      throw new Error(`Failed to fetch organization: ${fetchError.message}`);
    }

    const existingDocs = (org?.document_metadata as Record<string, unknown>[]) || [];
    const newDoc = {
      title,
      status,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.email,
      url: urlData.publicUrl, // Storage reference path
    };

    const updatedDocs = [...existingDocs, newDoc];

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ document_metadata: updatedDocs })
      .eq("id", orgId);

    if (updateError) {
      console.error("[documents][upload][update-error]", updateError);
      // Rollback: delete uploaded file
      await supabase.storage.from("org-documents").remove([filePath]);
      throw updateError;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      user_id: session.user.id,
      action: "document_uploaded",
      metadata: { fileName: file.name, fileSize: file.size, title },
    });

    return NextResponse.json({
      document: newDoc,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("[documents][upload][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
