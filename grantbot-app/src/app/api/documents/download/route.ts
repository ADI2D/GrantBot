import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
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
    const filePath = request.nextUrl.searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
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

    // Verify file belongs to this org (path should start with orgId)
    if (!filePath.startsWith(`${orgId}/`)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create signed URL (expires in 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("org-documents")
      .createSignedUrl(filePath, 3600);

    if (urlError || !signedUrlData) {
      console.error("[documents][download][url-error]", urlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      user_id: user.id,
      action: "document_downloaded",
      metadata: { filePath },
    });

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("[documents][download][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}
