"use client";

/**
 * Test Page for Unified OpportunityList Component
 *
 * This page demonstrates the OpportunityList component working with
 * UnifiedDataService for nonprofit context.
 *
 * TODO: Remove this test page once OpportunityList is integrated into main pages
 */

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";
import { UnifiedDataService } from "@/lib/unified-data-service";
import { OpportunityList, type OpportunityFilters } from "@/components/shared";
import { type DataContext, type UnifiedOpportunity } from "@/types/unified-data";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { useOrg } from "@/hooks/use-org";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function OpportunitiesTestPage() {
  const { currentOrgId } = useOrg();
  const [context, setContext] = useState<DataContext | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [dataService, setDataService] = useState<UnifiedDataService | null>(null);

  // Initialize context and data service
  useEffect(() => {
    const initializeContext = async () => {
      try {
        const supabase = getBrowserSupabaseClient();

        // Fetch organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, parent_type')
          .eq('id', currentOrgId)
          .single();

        if (orgError) throw orgError;
        if (!org) throw new Error('Organization not found');

        // Create context
        const ctx: DataContext = {
          type: 'organization',
          id: org.id,
          name: org.name,
        };

        setContext(ctx);

        // Create data service
        const service = new UnifiedDataService(supabase, ctx);
        setDataService(service);
      } catch (err) {
        console.error('Failed to initialize context:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
      }
    };

    if (currentOrgId) {
      initializeContext();
    }
  }, [currentOrgId]);

  // Fetch opportunities handler
  const handleFetchOpportunities = useCallback(async (filters: OpportunityFilters): Promise<UnifiedOpportunity[]> => {
    if (!dataService) {
      throw new Error('Data service not initialized');
    }

    try {
      const opportunities = await dataService.fetchOpportunities(filters);
      return opportunities;
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
      throw err;
    }
  }, [dataService]);

  // Create proposal handler
  const handleCreateProposal = useCallback(async (opportunityId: string) => {
    if (!dataService || !context) {
      throw new Error('Data service not initialized');
    }

    try {
      const proposal = await dataService.createProposal({
        opportunityId,
        opportunityName: 'New Proposal', // Will be populated from opportunity
        ownerName: context.name || 'Unknown',
        contextType: context.type,
        contextId: context.id,
      });

      return { proposal: { id: proposal.id } };
    } catch (err) {
      console.error('Failed to create proposal:', err);
      throw err;
    }
  }, [dataService, context]);

  // Toggle bookmark handler
  const handleToggleBookmark = useCallback(async (opportunityId: string, isBookmarked: boolean) => {
    if (!context) {
      throw new Error('Context not initialized');
    }

    try {
      const supabase = createClient();
      const method = isBookmarked ? 'DELETE' : 'POST';
      const url = isBookmarked
        ? `/api/opportunities/bookmark?orgId=${context.id}&opportunityId=${opportunityId}`
        : `/api/opportunities/bookmark?orgId=${context.id}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ opportunityId }) : undefined,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      throw err;
    }
  }, [context]);

  if (error) {
    return <PageError message={error.message} />;
  }

  if (!context || !dataService) {
    return <PageLoader label="Initializing unified data service" />;
  }

  return (
    <div className="space-y-6">
      {/* Feature flag status banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">
          🧪 Test Page - Unified OpportunityList Component
        </p>
        <p className="mt-1 text-xs text-blue-700">
          This page uses the new UnifiedDataService and shared OpportunityList component.
          Feature flags: UNIFIED_OPPORTUNITIES={FEATURE_FLAGS.UNIFIED_OPPORTUNITIES ? 'ON' : 'OFF'}
        </p>
        <p className="mt-2 text-xs text-blue-600">
          Context: {context.type} | ID: {context.id} | Name: {context.name}
        </p>
      </div>

      {/* Unified OpportunityList Component */}
      <OpportunityList
        context={context}
        onFetchOpportunities={handleFetchOpportunities}
        onCreateProposal={handleCreateProposal}
        onToggleBookmark={handleToggleBookmark}
        enableAddOpportunity={false}
      />
    </div>
  );
}
