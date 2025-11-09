/**
 * Focus Area Taxonomy Types
 *
 * Standard taxonomy for categorizing organizations and grant opportunities.
 * Maps to NTEE codes for 990 data matching.
 */

export const FOCUS_AREA_IDS = [
  'arts-culture',
  'education',
  'environment',
  'health',
  'human-services',
  'youth-development',
  'community-development',
  'research-science',
  'international',
  'other',
] as const;

export type FocusAreaId = typeof FOCUS_AREA_IDS[number];

export interface FocusArea {
  id: FocusAreaId;
  label: string;
  description: string;
  ntee_codes: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
}

export const FOCUS_AREAS: Record<FocusAreaId, Omit<FocusArea, 'created_at'>> = {
  'arts-culture': {
    id: 'arts-culture',
    label: 'Arts & Culture',
    description: 'Museums, performing arts, cultural programs, humanities',
    ntee_codes: ['A'],
    sort_order: 1,
    active: true,
  },
  'education': {
    id: 'education',
    label: 'Education',
    description: 'K-12, higher education, literacy, vocational training',
    ntee_codes: ['B'],
    sort_order: 2,
    active: true,
  },
  'environment': {
    id: 'environment',
    label: 'Environment & Animals',
    description: 'Conservation, climate, wildlife, sustainability',
    ntee_codes: ['C', 'D'],
    sort_order: 3,
    active: true,
  },
  'health': {
    id: 'health',
    label: 'Health & Wellness',
    description: 'Healthcare, mental health, public health, substance abuse',
    ntee_codes: ['E', 'F', 'G'],
    sort_order: 4,
    active: true,
  },
  'human-services': {
    id: 'human-services',
    label: 'Human Services',
    description: 'Social services, homelessness, food security, family support',
    ntee_codes: ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'],
    sort_order: 5,
    active: true,
  },
  'youth-development': {
    id: 'youth-development',
    label: 'Youth Development',
    description: 'Youth programs, mentoring, after-school, camps',
    ntee_codes: ['O', 'P'],
    sort_order: 6,
    active: true,
  },
  'community-development': {
    id: 'community-development',
    label: 'Community Development',
    description: 'Housing, economic development, community building, neighborhood improvement',
    ntee_codes: ['L', 'S'],
    sort_order: 7,
    active: true,
  },
  'research-science': {
    id: 'research-science',
    label: 'Research & Science',
    description: 'Scientific research, STEM education, technology innovation',
    ntee_codes: ['U', 'H'],
    sort_order: 8,
    active: true,
  },
  'international': {
    id: 'international',
    label: 'International',
    description: 'International development, global health, foreign aid',
    ntee_codes: ['Q'],
    sort_order: 9,
    active: true,
  },
  'other': {
    id: 'other',
    label: 'Other',
    description: 'Other causes and programs not listed above',
    ntee_codes: ['Y', 'Z'],
    sort_order: 10,
    active: true,
  },
};

/**
 * Get all focus areas sorted by sort_order
 */
export function getAllFocusAreas(): Array<Omit<FocusArea, 'created_at'>> {
  return Object.values(FOCUS_AREAS).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Get focus area by ID
 */
export function getFocusArea(id: FocusAreaId): Omit<FocusArea, 'created_at'> | undefined {
  return FOCUS_AREAS[id];
}

/**
 * Get focus area labels by IDs
 */
export function getFocusAreaLabels(ids: FocusAreaId[]): string[] {
  return ids.map(id => FOCUS_AREAS[id]?.label || id).filter(Boolean);
}

/**
 * Calculate match score between org and opportunity focus areas
 * Returns 0-100 score
 */
export function calculateFocusAreaMatchScore(
  orgAreas: FocusAreaId[],
  oppAreas: FocusAreaId[]
): number {
  if (!orgAreas.length || !oppAreas.length) return 0;

  const overlapCount = orgAreas.filter(area => oppAreas.includes(area)).length;
  if (overlapCount === 0) return 0;

  // Perfect match: both have same areas
  if (overlapCount === orgAreas.length && overlapCount === oppAreas.length) {
    return 100;
  }

  // Opportunity areas are subset of org areas: 100% (opp fully matches)
  if (overlapCount === oppAreas.length) {
    return 100;
  }

  // Partial match: score based on overlap percentage
  return (overlapCount / orgAreas.length) * 100;
}

/**
 * Sort opportunities by focus area match score
 * Perfect matches (100% with all areas) first, then partial matches
 */
export function sortByFocusAreaMatch<T extends { focus_areas?: FocusAreaId[] }>(
  items: T[],
  orgAreas: FocusAreaId[]
): T[] {
  return [...items].sort((a, b) => {
    const aScore = calculateFocusAreaMatchScore(orgAreas, a.focus_areas || []);
    const bScore = calculateFocusAreaMatchScore(orgAreas, b.focus_areas || []);

    // Higher scores first
    if (aScore !== bScore) return bScore - aScore;

    // If scores equal, prefer opportunities with more overlapping areas
    const aOverlap = (a.focus_areas || []).filter(area => orgAreas.includes(area)).length;
    const bOverlap = (b.focus_areas || []).filter(area => orgAreas.includes(area)).length;

    return bOverlap - aOverlap;
  });
}
