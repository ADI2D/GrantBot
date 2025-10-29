import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

function redirectToLogin(req: NextRequest, reason: "admin" | "org" | "auth") {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = "/login";
  if (reason === "admin") {
    redirectUrl.searchParams.set("admin", "1");
  } else if (reason === "org") {
    redirectUrl.searchParams.set("missingOrg", "1");
  }
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      return redirectToLogin(req, "admin");
    }

    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!adminRecord) {
      return redirectToLogin(req, "admin");
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/opportunities/:path*",
    "/proposals/:path*",
    "/workspace/:path*",
    "/analytics/:path*",
    "/checklists/:path*",
    "/admin/:path*",
  ],
};
