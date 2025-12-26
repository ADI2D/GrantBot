"use client";

/**
 * Test Page for Unified OpportunityList Component (Freelancer Context)
 *
 * This page demonstrates the OpportunityList component working with
 * UnifiedDataService for freelancer context.
 *
 * TODO: Remove this test page once OpportunityList is integrated into main pages
 */

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";
import { UnifiedDataService } from "@/lib/unified-data-service";
import { OpportunityList, type OpportunityFilters } from "@/components/shared";
import { type DataContext, type UnifiedOpportunity } from "@/types/unified-data";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default function FreelancerOpportunitiesTestPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = use(searchParams);
  const clientId = params?.client ?? null;

  const [context, setContext] = useState<DataContext | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [dataService, setDataService] = useState<UnifiedDataService | null>(null);

  // Initialize context and data service
  useEffect(() => {
    const initializeContext = async () => {
      try {
        const supabase = getBrowserSupabaseClient();

        if (!clientId) {
          throw new Error('Client ID is required');
        }

        // Fetch client details
        const { data: client, error: clientError } = await supabase
          .from('organizations')
          .select('id, name, freelancer_user_id')
          .eq('id', clientId)
          .eq('parent_type', 'client')
          .single();

        if (clientError) throw clientError;
        if (!client) throw new Error('Client not found');

        // Create context
        const ctx: DataContext = {
          type: 'freelancer',
          id: client.id,
          userId: client.freelancer_user_id,
          name: client.name,
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

    if (clientId) {
      initializeContext();
    }
  }, [clientId]);

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

  // Create proposal handler (freelancers navigate differently)
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
        freelancerUserId: context.userId,
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

  // Add opportunity handler
  const handleAddOpportunity = useCallback(async (data: { title: string; method: "url" | "document"; urls?: string[]; file?: File }) => {
    try {
      if (data.method === "url" && data.urls) {
        const response = await fetch("/api/freelancer/opportunities/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title, urls: data.urls }),
        });

        if (!response.ok) throw new Error("Failed to analyze URLs");
        await response.json();
      } else if (data.method === "document" && data.file) {
        const formData = new FormData();
        formData.append("title", data.title);
        formData.append("file", data.file);

        const response = await fetch("/api/freelancer/opportunities/analyze-document", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to analyze document");
        await response.json();
      }
    } catch (err) {
      console.error('Failed to add opportunity:', err);
      throw err;
    }
  }, []);

  if (!clientId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          ⚠️ Client ID Required
        </p>
        <p className="mt-1 text-xs text-amber-700">
          Please provide a client ID in the URL: ?client=CLIENT_ID
        </p>
      </div>
    );
  }

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
          🧪 Test Page - Unified OpportunityList Component (Freelancer)
        </p>
        <p className="mt-1 text-xs text-blue-700">
          This page uses the new UnifiedDataService and shared OpportunityList component.
          Feature flags: UNIFIED_OPPORTUNITIES={FEATURE_FLAGS.UNIFIED_OPPORTUNITIES ? 'ON' : 'OFF'}
        </p>
        <p className="mt-2 text-xs text-blue-600">
          Context: {context.type} | Client ID: {context.id} | Name: {context.name}
        </p>
      </div>

      {/* Unified OpportunityList Component */}
      <OpportunityList
        context={context}
        onFetchOpportunities={handleFetchOpportunities}
        onCreateProposal={handleCreateProposal}
        onToggleBookmark={handleToggleBookmark}
        onAddOpportunity={handleAddOpportunity}
        backLink={{ href: `/freelancer/clients/${clientId}`, label: "Back to client" }}
        enableAddOpportunity={true}
      />
    </div>
  );
}
