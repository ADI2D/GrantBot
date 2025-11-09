import { describe, it, expect } from 'vitest';
import {
  FOCUS_AREA_IDS,
  FOCUS_AREAS,
  getAllFocusAreas,
  getFocusArea,
  getFocusAreaLabels,
  calculateFocusAreaMatchScore,
  sortByFocusAreaMatch,
  type FocusAreaId,
} from '@/types/focus-areas';

describe('Focus Areas', () => {
  describe('FOCUS_AREA_IDS', () => {
    it('should contain exactly 10 focus area IDs', () => {
      expect(FOCUS_AREA_IDS).toHaveLength(10);
    });

    it('should include all expected focus areas', () => {
      expect(FOCUS_AREA_IDS).toContain('arts-culture');
      expect(FOCUS_AREA_IDS).toContain('education');
      expect(FOCUS_AREA_IDS).toContain('environment');
      expect(FOCUS_AREA_IDS).toContain('health');
      expect(FOCUS_AREA_IDS).toContain('human-services');
      expect(FOCUS_AREA_IDS).toContain('youth-development');
      expect(FOCUS_AREA_IDS).toContain('community-development');
      expect(FOCUS_AREA_IDS).toContain('research-science');
      expect(FOCUS_AREA_IDS).toContain('international');
      expect(FOCUS_AREA_IDS).toContain('other');
    });
  });

  describe('FOCUS_AREAS', () => {
    it('should have entries for all focus area IDs', () => {
      FOCUS_AREA_IDS.forEach(id => {
        expect(FOCUS_AREAS[id]).toBeDefined();
        expect(FOCUS_AREAS[id].id).toBe(id);
      });
    });

    it('should have required properties for each focus area', () => {
      FOCUS_AREA_IDS.forEach(id => {
        const area = FOCUS_AREAS[id];
        expect(area).toHaveProperty('id');
        expect(area).toHaveProperty('label');
        expect(area).toHaveProperty('description');
        expect(area).toHaveProperty('ntee_codes');
        expect(area).toHaveProperty('sort_order');
        expect(area).toHaveProperty('active');
      });
    });

    it('should have unique sort orders', () => {
      const sortOrders = Object.values(FOCUS_AREAS).map(area => area.sort_order);
      const uniqueSortOrders = new Set(sortOrders);
      expect(sortOrders.length).toBe(uniqueSortOrders.size);
    });

    it('should have all areas marked as active', () => {
      Object.values(FOCUS_AREAS).forEach(area => {
        expect(area.active).toBe(true);
      });
    });

    it('should have NTEE codes for each area', () => {
      Object.values(FOCUS_AREAS).forEach(area => {
        expect(Array.isArray(area.ntee_codes)).toBe(true);
        expect(area.ntee_codes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllFocusAreas', () => {
    it('should return all 10 focus areas', () => {
      const areas = getAllFocusAreas();
      expect(areas).toHaveLength(10);
    });

    it('should return areas sorted by sort_order', () => {
      const areas = getAllFocusAreas();
      for (let i = 1; i < areas.length; i++) {
        expect(areas[i].sort_order).toBeGreaterThan(areas[i - 1].sort_order);
      }
    });

    it('should return areas in correct order', () => {
      const areas = getAllFocusAreas();
      expect(areas[0].id).toBe('arts-culture');
      expect(areas[1].id).toBe('education');
      expect(areas[9].id).toBe('other');
    });
  });

  describe('getFocusArea', () => {
    it('should return focus area by ID', () => {
      const area = getFocusArea('education');
      expect(area).toBeDefined();
      expect(area?.id).toBe('education');
      expect(area?.label).toBe('Education');
    });

    it('should return undefined for invalid ID', () => {
      const area = getFocusArea('invalid-id' as FocusAreaId);
      expect(area).toBeUndefined();
    });

    it('should return correct data for all IDs', () => {
      FOCUS_AREA_IDS.forEach(id => {
        const area = getFocusArea(id);
        expect(area).toBeDefined();
        expect(area?.id).toBe(id);
      });
    });
  });

  describe('getFocusAreaLabels', () => {
    it('should return labels for valid IDs', () => {
      const labels = getFocusAreaLabels(['education', 'health']);
      expect(labels).toEqual(['Education', 'Health & Wellness']);
    });

    it('should return empty array for empty input', () => {
      const labels = getFocusAreaLabels([]);
      expect(labels).toEqual([]);
    });

    it('should handle single ID', () => {
      const labels = getFocusAreaLabels(['environment']);
      expect(labels).toEqual(['Environment & Animals']);
    });

    it('should handle invalid IDs by using the ID as fallback', () => {
      const labels = getFocusAreaLabels(['education', 'invalid' as FocusAreaId]);
      expect(labels).toContain('Education');
      expect(labels).toContain('invalid');
    });

    it('should maintain order of input IDs', () => {
      const labels = getFocusAreaLabels(['health', 'education', 'arts-culture']);
      expect(labels[0]).toBe('Health & Wellness');
      expect(labels[1]).toBe('Education');
      expect(labels[2]).toBe('Arts & Culture');
    });
  });

  describe('calculateFocusAreaMatchScore', () => {
    it('should return 0 when org has no focus areas', () => {
      const score = calculateFocusAreaMatchScore([], ['education']);
      expect(score).toBe(0);
    });

    it('should return 0 when opportunity has no focus areas', () => {
      const score = calculateFocusAreaMatchScore(['education'], []);
      expect(score).toBe(0);
    });

    it('should return 0 when there is no overlap', () => {
      const score = calculateFocusAreaMatchScore(
        ['education', 'health'],
        ['arts-culture', 'environment']
      );
      expect(score).toBe(0);
    });

    it('should return 100 for perfect match (same areas)', () => {
      const score = calculateFocusAreaMatchScore(
        ['education', 'health'],
        ['education', 'health']
      );
      expect(score).toBe(100);
    });

    it('should return 100 when opp areas are subset of org areas', () => {
      const score = calculateFocusAreaMatchScore(
        ['education', 'health', 'environment'],
        ['education', 'health']
      );
      expect(score).toBe(100);
    });

    it('should return partial score for partial match', () => {
      // Org has 4 areas, opp matches 2 = 50%
      const score = calculateFocusAreaMatchScore(
        ['education', 'health', 'environment', 'arts-culture'],
        ['education', 'health', 'youth-development']
      );
      expect(score).toBe(50);
    });

    it('should return 50 for 1 of 2 org areas matching', () => {
      const score = calculateFocusAreaMatchScore(
        ['education', 'health'],
        ['education', 'environment']
      );
      expect(score).toBe(50);
    });

    it('should handle single area matches', () => {
      const score = calculateFocusAreaMatchScore(['education'], ['education']);
      expect(score).toBe(100);
    });

    it('should calculate correct percentage for various overlaps', () => {
      // Opp areas are subset of org areas = 100% (perfect match for opportunity)
      const score1 = calculateFocusAreaMatchScore(
        ['education', 'health', 'environment'],
        ['education']
      );
      expect(score1).toBe(100);

      // All org areas match opportunity, opp has more = 100% (all org areas covered)
      const score2 = calculateFocusAreaMatchScore(
        ['education', 'health', 'environment'],
        ['education', 'health', 'environment', 'arts-culture']
      );
      expect(score2).toBe(100);

      // Org matches some but not all opp areas = proportional to org areas matched
      const score3 = calculateFocusAreaMatchScore(
        ['education', 'health', 'environment', 'arts-culture'],
        ['education', 'international', 'other']
      );
      expect(score3).toBe(25); // 1 of 4 org areas = 25%
    });
  });

  describe('sortByFocusAreaMatch', () => {
    const mockOpportunities = [
      { id: 1, name: 'Perfect Match', focus_areas: ['education', 'health'] as FocusAreaId[] },
      { id: 2, name: 'Partial Match', focus_areas: ['education', 'environment'] as FocusAreaId[] },
      { id: 3, name: 'No Match', focus_areas: ['arts-culture'] as FocusAreaId[] },
      { id: 4, name: 'Subset Match', focus_areas: ['education'] as FocusAreaId[] },
      { id: 5, name: 'No Focus Areas', focus_areas: [] as FocusAreaId[] },
    ];

    it('should sort opportunities by match score descending', () => {
      const orgAreas: FocusAreaId[] = ['education', 'health'];
      const sorted = sortByFocusAreaMatch(mockOpportunities, orgAreas);

      // Perfect match and subset match should be first (both 100%)
      expect([sorted[0].id, sorted[1].id].sort()).toEqual([1, 4].sort());

      // Partial match should be third (50%)
      expect(sorted[2].id).toBe(2);

      // No match and empty should be last (0%)
      expect([sorted[3].id, sorted[4].id].sort()).toEqual([3, 5].sort());
    });

    it('should not mutate original array', () => {
      const orgAreas: FocusAreaId[] = ['education'];
      const original = [...mockOpportunities];
      sortByFocusAreaMatch(mockOpportunities, orgAreas);

      expect(mockOpportunities).toEqual(original);
    });

    it('should handle empty opportunities array', () => {
      const sorted = sortByFocusAreaMatch([], ['education']);
      expect(sorted).toEqual([]);
    });

    it('should handle opportunities without focus_areas property', () => {
      const opps = [
        { id: 1, name: 'No property' },
        { id: 2, name: 'With property', focus_areas: ['education'] as FocusAreaId[] },
      ];

      const sorted = sortByFocusAreaMatch(opps, ['education']);

      // Opportunity with matching focus area should be first
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
    });

    it('should prefer opportunities with more overlapping areas when scores equal', () => {
      const opps = [
        { id: 1, focus_areas: ['education'] as FocusAreaId[] },
        { id: 2, focus_areas: ['education', 'health', 'environment'] as FocusAreaId[] },
      ];

      const orgAreas: FocusAreaId[] = ['education', 'health', 'environment', 'arts-culture'];
      const sorted = sortByFocusAreaMatch(opps, orgAreas);

      // Both are 100% matches, but #2 has more overlapping areas (3 vs 1)
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
    });

    it('should maintain stable sort for items with same score and overlap', () => {
      const opps = [
        { id: 1, focus_areas: ['education'] as FocusAreaId[] },
        { id: 2, focus_areas: ['health'] as FocusAreaId[] },
        { id: 3, focus_areas: ['education'] as FocusAreaId[] },
      ];

      const sorted = sortByFocusAreaMatch(opps, ['education', 'health']);

      // All have same score (50%) and overlap (1)
      // Order should be based on original positions
      expect(sorted.map(o => o.id)).toEqual([1, 2, 3]);
    });
  });
});
