"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/hooks/use-org";
import { OpportunitiesPage } from "@/components/opportunities/opportunities-page";
import { type FocusAreaId } from "@/types/focus-areas";

export default function NonprofitOpportunitiesPage() {
  const { currentOrgId } = useOrg();
  const [orgFocusAreas, setOrgFocusAreas] = useState<FocusAreaId[]>([]);

  // Fetch organization focus areas for matching
  useEffect(() => {
    const fetchOrgFocusAreas = async () => {
      try {
        const response = await fetch(`/api/organization?orgId=${currentOrgId}`);
        if (response.ok) {
          const data = await response.json();
          setOrgFocusAreas((data.organization?.focus_areas || []) as FocusAreaId[]);
        }
      } catch (error) {
        console.error("Failed to fetch org focus areas:", error);
      }
    };
    fetchOrgFocusAreas();
  }, [currentOrgId]);

  return (
    <OpportunitiesPage
      mode="nonprofit"
      orgId={currentOrgId}
      orgFocusAreas={orgFocusAreas}
    />
  );
}
