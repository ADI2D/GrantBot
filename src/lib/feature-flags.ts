/**
 * Feature Flags
 *
 * Feature flag system for gradual rollout of the unified architecture.
 * Allows enabling/disabling features per environment or user segment.
 *
 * Created: 2025-12-26
 * Part of: Phase 1 - Foundation & Shared Infrastructure
 */

// ============================================================================
// Feature Flag Definitions
// ============================================================================

export const FEATURE_FLAGS = {
  // Phase 1: Foundation
  UNIFIED_PROPOSALS: process.env.NEXT_PUBLIC_FF_UNIFIED_PROPOSALS === 'true',
  UNIFIED_OPPORTUNITIES: process.env.NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITIES === 'true',
  UNIFIED_DOCUMENTS: process.env.NEXT_PUBLIC_FF_UNIFIED_DOCUMENTS === 'true',

  // Phase 2: Components
  UNIFIED_PROPOSAL_EDITOR: process.env.NEXT_PUBLIC_FF_UNIFIED_PROPOSAL_EDITOR === 'true',
  UNIFIED_OPPORTUNITY_LIST: process.env.NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITY_LIST === 'true',
  UNIFIED_DOCUMENT_MANAGER: process.env.NEXT_PUBLIC_FF_UNIFIED_DOCUMENT_MANAGER === 'true',
  UNIFIED_COMMENTS: process.env.NEXT_PUBLIC_FF_UNIFIED_COMMENTS === 'true',

  // Phase 3: APIs
  UNIFIED_API_ROUTES: process.env.NEXT_PUBLIC_FF_UNIFIED_API_ROUTES === 'true',

  // Phase 4: UI/UX
  CONTEXT_SWITCHER: process.env.NEXT_PUBLIC_FF_CONTEXT_SWITCHER === 'true',

  // Development/Testing
  DEBUG_MODE: process.env.NEXT_PUBLIC_FF_DEBUG_MODE === 'true',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook to check if a feature flag is enabled
 *
 * Usage:
 * ```tsx
 * const isEnabled = useFeatureFlag('UNIFIED_PROPOSALS');
 * if (isEnabled) {
 *   // Use new unified system
 * } else {
 *   // Use legacy system
 * }
 * ```
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag];
}

// ============================================================================
// Direct Access Functions
// ============================================================================

/**
 * Checks if a feature flag is enabled (non-hook version)
 * Use this in non-React contexts (API routes, server functions, etc.)
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Checks if multiple feature flags are all enabled
 */
export function areAllFeaturesEnabled(...flags: FeatureFlagKey[]): boolean {
  return flags.every(flag => FEATURE_FLAGS[flag]);
}

/**
 * Checks if any of the feature flags are enabled
 */
export function isAnyFeatureEnabled(...flags: FeatureFlagKey[]): boolean {
  return flags.some(flag => FEATURE_FLAGS[flag]);
}

// ============================================================================
// Feature Flag Groups
// ============================================================================

/**
 * Checks if all Phase 1 features are enabled
 */
export function isPhase1Complete(): boolean {
  return areAllFeaturesEnabled(
    'UNIFIED_PROPOSALS',
    'UNIFIED_OPPORTUNITIES',
    'UNIFIED_DOCUMENTS'
  );
}

/**
 * Checks if all Phase 2 features are enabled
 */
export function isPhase2Complete(): boolean {
  return areAllFeaturesEnabled(
    'UNIFIED_PROPOSAL_EDITOR',
    'UNIFIED_OPPORTUNITY_LIST',
    'UNIFIED_DOCUMENT_MANAGER',
    'UNIFIED_COMMENTS'
  );
}

/**
 * Checks if all Phase 3 features are enabled
 */
export function isPhase3Complete(): boolean {
  return isFeatureEnabled('UNIFIED_API_ROUTES');
}

/**
 * Checks if the unified architecture is fully rolled out
 */
export function isUnifiedArchitectureComplete(): boolean {
  return isPhase1Complete() && isPhase2Complete() && isPhase3Complete();
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Gets all feature flags and their current state
 * Useful for debugging and admin panels
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  return { ...FEATURE_FLAGS };
}

/**
 * Logs all feature flag states to console (only in debug mode)
 */
export function logFeatureFlags(): void {
  if (FEATURE_FLAGS.DEBUG_MODE) {
    console.group('🚩 Feature Flags');
    Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    console.groupEnd();
  }
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Gets the environment variables needed for feature flags
 * Returns them in a format suitable for .env files
 */
export function getFeatureFlagEnvVars(): string {
  const lines: string[] = [
    '# Feature Flags for Unified Architecture',
    '# Set to "true" to enable, "false" or omit to disable',
    '',
    '# Phase 1: Foundation',
    'NEXT_PUBLIC_FF_UNIFIED_PROPOSALS=false',
    'NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITIES=false',
    'NEXT_PUBLIC_FF_UNIFIED_DOCUMENTS=false',
    '',
    '# Phase 2: Components',
    'NEXT_PUBLIC_FF_UNIFIED_PROPOSAL_EDITOR=false',
    'NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITY_LIST=false',
    'NEXT_PUBLIC_FF_UNIFIED_DOCUMENT_MANAGER=false',
    'NEXT_PUBLIC_FF_UNIFIED_COMMENTS=false',
    '',
    '# Phase 3: APIs',
    'NEXT_PUBLIC_FF_UNIFIED_API_ROUTES=false',
    '',
    '# Phase 4: UI/UX',
    'NEXT_PUBLIC_FF_CONTEXT_SWITCHER=false',
    '',
    '# Development/Testing',
    'NEXT_PUBLIC_FF_DEBUG_MODE=false',
  ];

  return lines.join('\n');
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to ensure a string is a valid feature flag key
 */
export function isValidFeatureFlag(key: string): key is FeatureFlagKey {
  return key in FEATURE_FLAGS;
}
