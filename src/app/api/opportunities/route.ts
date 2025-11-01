import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { fetchOpportunities } from "@/lib/data-service";
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
    const opportunities = await fetchOpportunities(supabase, orgId);
    return NextResponse.json({ opportunities });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
