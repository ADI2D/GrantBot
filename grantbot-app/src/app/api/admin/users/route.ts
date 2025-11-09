import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { requireAdminRole } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import type { AdminRole } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await requireAdminRole(user.id, ["super_admin"]);

  const adminClient = getServiceSupabaseClient();
  const searchParam = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("perPage") ?? "25")));

  const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error("[admin][users][list]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data?.users ?? [];
  const filteredUsers = searchParam
    ? users.filter((u) => {
        const email = u.email?.toLowerCase() ?? "";
        const name = typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name.toLowerCase() : "";
        return email.includes(searchParam) || name.includes(searchParam);
      })
    : users;

  const userIds = filteredUsers.map((user) => user.id);
  const adminRoles: Record<string, AdminRole> = {};
  const userOrganizations: Record<string, { id: string; name: string | null; membershipRole: string | null }[]> = {};

  if (userIds.length > 0) {
    const { data: roleRows, error: roleError } = await adminClient
      .from("admin_users")
      .select("user_id, role")
      .in("user_id", userIds);

    if (!roleError && roleRows) {
      for (const row of roleRows) {
        adminRoles[row.user_id] = row.role as AdminRole;
      }
    }

    const { data: membershipRows, error: membershipError } = await adminClient
      .from("org_members")
      .select("user_id, role, organizations:organization_id(id, name)")
      .in("user_id", userIds);

    if (!membershipError && membershipRows) {
      for (const row of membershipRows) {
        const org = row.organizations;
        if (!org) continue;
        if (!userOrganizations[row.user_id]) {
          userOrganizations[row.user_id] = [];
        }
        userOrganizations[row.user_id].push({
          id: org.id,
          name: org.name,
          membershipRole: row.role ?? null,
        });
      }
    }
  }

  const payload = filteredUsers.map((authUser) => ({
    id: authUser.id,
    email: authUser.email,
    phone: authUser.phone,
    role: adminRoles[authUser.id] ?? "read_only",
    createdAt: authUser.created_at ?? null,
    lastSignInAt: authUser.last_sign_in_at ?? null,
    isConfirmed: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
    hasMfa: Array.isArray(authUser.factors) ? authUser.factors.length > 0 : false,
    organizations: userOrganizations[authUser.id] ?? [],
  }));

  return NextResponse.json({
    users: payload,
    page,
    perPage,
    total: data?.total ?? null,
  });
}
