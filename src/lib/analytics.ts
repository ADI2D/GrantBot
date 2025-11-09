/**
 * Analytics & Instrumentation
 *
 * PostHog integration for tracking user behavior, conversions, and product metrics.
 *
 * Usage:
 * - trackEvent('event_name', { property: 'value' })
 * - identifyUser(userId, { email, name })
 * - trackPageView(path)
 */

import posthog from 'posthog-js';

// Initialize PostHog (client-side only)
let isInitialized = false;

export function initializePostHog() {
  if (typeof window === 'undefined') return; // Server-side, skip
  if (isInitialized) return; // Already initialized

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('[analytics] PostHog API key not found. Analytics disabled.');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug(); // Enable debug mode in development
      }
    },
    capture_pageview: false, // We'll handle pageviews manually
    capture_pageleave: true, // Track when users leave pages
    autocapture: {
      dom_event_allowlist: ['click'], // Only auto-capture clicks
      url_allowlist: [], // We'll track URLs manually
      element_allowlist: ['button', 'a'], // Only track button and link clicks
    },
  });

  isInitialized = true;
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  if (!isInitialized) initializePostHog();

  posthog.capture(eventName, properties);
}

/**
 * Identify a user
 */
export function identifyUser(userId: string, properties?: {
  email?: string;
  name?: string;
  accountType?: 'nonprofit' | 'freelancer';
  organizationId?: string;
  organizationName?: string;
  planId?: string;
  [key: string]: any;
}) {
  if (typeof window === 'undefined') return;
  if (!isInitialized) initializePostHog();

  posthog.identify(userId, properties);
}

/**
 * Track page view
 */
export function trackPageView(path?: string) {
  if (typeof window === 'undefined') return;
  if (!isInitialized) initializePostHog();

  posthog.capture('$pageview', {
    $current_url: path || window.location.href,
  });
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;
  if (!isInitialized) return;

  posthog.reset();
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>) {
  if (typeof window === 'undefined') return;
  if (!isInitialized) initializePostHog();

  posthog.setPersonProperties(properties);
}

// Event constants for type safety
export const ANALYTICS_EVENTS = {
  // Authentication
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',
  LOGOUT_COMPLETED: 'logout_completed',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Proposals
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_EDITED: 'proposal_edited',
  PROPOSAL_DELETED: 'proposal_deleted',
  PROPOSAL_EXPORTED: 'proposal_exported',
  PROPOSAL_SUBMITTED: 'proposal_submitted',
  PROPOSAL_ARCHIVED: 'proposal_archived',

  // Opportunities
  OPPORTUNITY_VIEWED: 'opportunity_viewed',
  OPPORTUNITY_BOOKMARKED: 'opportunity_bookmarked',
  OPPORTUNITY_UNBOOKMARKED: 'opportunity_unbookmarked',
  OPPORTUNITY_SEARCHED: 'opportunity_searched',
  OPPORTUNITY_FILTERED: 'opportunity_filtered',

  // Freelancer
  CLIENT_CREATED: 'client_created',
  CLIENT_EDITED: 'client_edited',
  CLIENT_DELETED: 'client_deleted',
  DOCUMENT_UPLOADED: 'document_uploaded',
  NOTE_CREATED: 'note_created',

  // AI Features
  AI_SUGGESTION_REQUESTED: 'ai_suggestion_requested',
  AI_SUGGESTION_ACCEPTED: 'ai_suggestion_accepted',
  AI_SUGGESTION_REJECTED: 'ai_suggestion_rejected',

  // Billing
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Engagement
  PAGE_VIEW: 'page_view',
  FEATURE_DISCOVERED: 'feature_discovered',
  HELP_CLICKED: 'help_clicked',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
