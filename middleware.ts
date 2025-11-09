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
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return redirectToLogin(req, "admin");
    }

    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      return redirectToLogin(req, "admin");
    }
  }

  // Onboarding gate for dashboard routes (except onboarding itself)
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/opportunities") ||
    pathname.startsWith("/proposals") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/checklists") ||
    pathname.startsWith("/billing");

  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (user && (isDashboardRoute || isOnboardingRoute)) {
    // Get user's org ID from cookie
    const orgCookie = req.cookies.get("grantspec_selected_org");

    if (orgCookie?.value) {
      // Check onboarding completion
      const { data: orgData } = await supabase
        .from("organizations")
        .select("onboarding_completion")
        .eq("id", orgCookie.value)
        .maybeSingle();

      const onboardingComplete = (orgData?.onboarding_completion ?? 0) >= 1.0;

      // Redirect to onboarding if not complete and trying to access dashboard routes
      if (!onboardingComplete && isDashboardRoute) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/onboarding";
        return NextResponse.redirect(redirectUrl);
      }

      // Redirect to dashboard if complete and on onboarding page
      if (onboardingComplete && isOnboardingRoute) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/dashboard";
        return NextResponse.redirect(redirectUrl);
      }
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
