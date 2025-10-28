import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { fetchProposals } from "@/lib/data-service";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const proposals = await fetchProposals(supabase, orgId);
    const target = proposals.find((proposal) => proposal.complianceSummary?.length) ?? proposals[0];
    const sections = target?.complianceSummary ?? [];

    const totals = sections.reduce(
      (acc, section) => {
        section.items.forEach((item) => {
          acc.total += 1;
          if (item.status === "complete" || item.status === "ready") {
            acc.complete += 1;
          }
        });
        return acc;
      },
      { complete: 0, total: 0 },
    );

    const completion = totals.total ? totals.complete / totals.total : 0;

    return NextResponse.json({ sections, completion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
