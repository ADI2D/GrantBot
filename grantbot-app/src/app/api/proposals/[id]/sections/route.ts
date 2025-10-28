import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { fetchProposalSections } from "@/lib/data-service";
import type { Database } from "@/types/database";

function getProposalId(path: string) {
  const segments = path.split("/");
  return segments[segments.length - 2];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const proposalId = getProposalId(request.nextUrl.pathname);
    const sections = await fetchProposalSections(supabase, proposalId);
    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sectionId, content } = await request.json();
    if (!sectionId) {
      return NextResponse.json({ error: "Missing sectionId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("proposal_sections")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", sectionId);

    if (error) {
      throw error;
    }

    const proposalId = getProposalId(request.nextUrl.pathname);
    const sections = await fetchProposalSections(supabase, proposalId);
    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
