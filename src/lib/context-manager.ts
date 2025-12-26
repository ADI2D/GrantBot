/**
 * Context Manager
 *
 * Handles detection and management of user context (nonprofit org vs freelancer client).
 * This enables the same code to work for both user types by determining the appropriate
 * data scope.
 *
 * Created: 2025-12-26
 * Part of: Phase 1 - Foundation & Shared Infrastructure
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataContext, ContextType } from "@/types/unified-data";

// ============================================================================
// Context Detection
// ============================================================================

/**
 * Detects the current user context from URL parameters or user profile
 *
 * Priority order:
 * 1. Explicit context params (orgId or clientId)
 * 2. User profile preference (accountType, activeClientId)
 * 3. Organization membership (default to first org)
 *
 * @throws Error if context cannot be determined
 */
export async function detectContext(
  supabase: SupabaseClient,
  params: URLSearchParams
): Promise<DataContext> {
  // Priority 1: Explicit context parameters
  const orgId = params.get('orgId');
  const clientId = params.get('clientId');

  if (orgId) {
    // Fetch org name for display
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .eq('parent_type', 'nonprofit')
      .single();

    return {
      type: 'organization',
      id: orgId,
      name: org?.name || undefined,
    };
  }

  if (clientId) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch client name for display
    const { data: client } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', clientId)
      .eq('parent_type', 'client')
      .eq('freelancer_user_id', user.id)
      .single();

    return {
      type: 'freelancer',
      id: clientId,
      userId: user.id,
      name: client?.name || undefined,
    };
  }

  // Priority 2: User profile preference
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check user profile for account type and active context
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('account_type, active_client_id')
    .eq('user_id', user.id)
    .single();

  if (!profileError && profile) {
    // If user is a freelancer with an active client
    if (profile.account_type === 'freelancer' && profile.active_client_id) {
      const { data: client } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.active_client_id)
        .eq('parent_type', 'client')
        .single();

      return {
        type: 'freelancer',
        id: profile.active_client_id,
        userId: user.id,
        name: client?.name || undefined,
      };
    }
  }

  // Priority 3: Organization membership (default for nonprofits)
  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membershipError && membership) {
    return {
      type: 'organization',
      id: membership.organization_id,
      name: (membership.organizations as any)?.name || undefined,
    };
  }

  // If no context can be determined, throw error
  throw new Error(
    'Unable to determine user context. Please select an organization or client.'
  );
}

/**
 * Detects context from route pathname
 * Useful for client-side context detection based on URL
 */
export function detectContextFromPath(pathname: string): Partial<DataContext> | null {
  // Freelancer routes
  if (pathname.startsWith('/freelancer')) {
    return { type: 'freelancer' };
  }

  // Dashboard routes (nonprofit)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/opportunities') || pathname.startsWith('/proposals')) {
    return { type: 'organization' };
  }

  return null;
}

// ============================================================================
// Context Validation
// ============================================================================

/**
 * Validates that the user has access to the specified context
 */
export async function validateContext(
  supabase: SupabaseClient,
  context: DataContext
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  if (context.type === 'organization') {
    // Check org membership
    const { data } = await supabase
      .from('org_members')
      .select('id')
      .eq('organization_id', context.id)
      .eq('user_id', user.id)
      .single();

    return !!data;
  }

  if (context.type === 'freelancer') {
    // Check client ownership
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', context.id)
      .eq('parent_type', 'client')
      .eq('freelancer_user_id', user.id)
      .single();

    return !!data;
  }

  return false;
}

// ============================================================================
// Context Switching
// ============================================================================

/**
 * Updates user profile to set active context
 * This allows the user to switch between multiple contexts
 */
export async function setActiveContext(
  supabase: SupabaseClient,
  context: DataContext
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Validate access first
  const hasAccess = await validateContext(supabase, context);
  if (!hasAccess) {
    throw new Error('User does not have access to this context');
  }

  // Update user profile
  const updates: any = {};

  if (context.type === 'freelancer') {
    updates.active_client_id = context.id;
    updates.account_type = 'freelancer';
  } else {
    updates.active_client_id = null;
    updates.account_type = 'nonprofit';
  }

  await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    });
}

// ============================================================================
// Context Listing
// ============================================================================

/**
 * Gets all available contexts for the current user
 * Useful for context switcher UI
 */
export async function getAvailableContexts(
  supabase: SupabaseClient
): Promise<DataContext[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const contexts: DataContext[] = [];

  // Get nonprofit organizations
  const { data: orgs } = await supabase
    .from('org_members')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id);

  if (orgs) {
    for (const org of orgs) {
      const orgData = org.organizations as any;
      if (orgData) {
        contexts.push({
          type: 'organization',
          id: orgData.id,
          name: orgData.name,
        });
      }
    }
  }

  // Get freelancer clients
  const { data: clients } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('parent_type', 'client')
    .eq('freelancer_user_id', user.id);

  if (clients) {
    for (const client of clients) {
      contexts.push({
        type: 'freelancer',
        id: client.id,
        userId: user.id,
        name: client.name,
      });
    }
  }

  return contexts;
}

// ============================================================================
// URL Parameter Helpers
// ============================================================================

/**
 * Converts a context object to URL search parameters
 */
export function contextToSearchParams(context: DataContext): URLSearchParams {
  const params = new URLSearchParams();

  if (context.type === 'organization') {
    params.set('orgId', context.id);
  } else if (context.type === 'freelancer') {
    params.set('clientId', context.id);
  }

  return params;
}

/**
 * Adds context parameters to a URL
 */
export function addContextToUrl(url: string, context: DataContext): string {
  const urlObj = new URL(url, window.location.origin);
  const params = contextToSearchParams(context);

  params.forEach((value, key) => {
    urlObj.searchParams.set(key, value);
  });

  return urlObj.toString();
}

/**
 * Extracts context from URL search parameters (client-side only)
 */
export function extractContextFromParams(searchParams: URLSearchParams): Partial<DataContext> | null {
  const orgId = searchParams.get('orgId');
  const clientId = searchParams.get('clientId');

  if (orgId) {
    return { type: 'organization', id: orgId };
  }

  if (clientId) {
    return { type: 'freelancer', id: clientId };
  }

  return null;
}
