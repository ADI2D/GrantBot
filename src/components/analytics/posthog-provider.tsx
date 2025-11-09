"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializePostHog, trackPageView, identifyUser } from '@/lib/analytics';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    initializePostHog();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      const url = searchParams ? `${pathname}?${searchParams.toString()}` : pathname;
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

/**
 * Hook to identify the current user in analytics
 * Call this after user logs in or when user data is loaded
 */
export function useIdentifyUser(user: {
  id: string;
  email?: string;
  accountType?: 'nonprofit' | 'freelancer';
  organizationId?: string;
  organizationName?: string;
  planId?: string;
} | null) {
  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        accountType: user.accountType,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        planId: user.planId,
      });
    }
  }, [user]);
}
