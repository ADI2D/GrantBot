import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { resolveOrgId } from "@/lib/org";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: proposalsThisMonth } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", firstDayOfMonth.toISOString());

    const { data: org } = await supabase
      .from("organizations")
      .select("plan_id")
      .eq("id", orgId)
      .single();

    return NextResponse.json({
      planId: org?.plan_id ?? "starter",
      proposalsThisMonth: proposalsThisMonth ?? 0,
      submissionsThisQuarter: 0,
      nextReset: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() + 1, 1).toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
