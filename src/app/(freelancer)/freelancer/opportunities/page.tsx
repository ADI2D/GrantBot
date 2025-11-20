"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OpportunitiesPage } from "@/components/opportunities/opportunities-page";
import { type FocusAreaId } from "@/types/focus-areas";

export const dynamic = "force-dynamic";

export default function FreelancerOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; search?: string }>;
}) {
  const params = use(searchParams);
  const clientId = params?.client ?? null;
  const router = useRouter();
  const [clientFocusAreas, setClientFocusAreas] = useState<FocusAreaId[]>([]);
  const [clientName, setClientName] = useState<string>("");
  const [clientMission, setClientMission] = useState<string>("");

  // Fetch client profile for AI matching and sorting
  useEffect(() => {
    const fetchClientProfile = async () => {
      if (!clientId) return;
      try {
        const response = await fetch(`/api/freelancer/clients/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          setClientFocusAreas((data.client?.focus_areas || []) as FocusAreaId[]);
          setClientName(data.client?.name || "");
          setClientMission(data.client?.mission || "");
        }
      } catch (error) {
        console.error("Failed to fetch client profile:", error);
      }
    };
    fetchClientProfile();
  }, [clientId]);

  const handleBack = () => {
    if (clientId) {
      router.push(`/freelancer/clients/${clientId}`);
    } else {
      router.push("/freelancer/clients");
    }
  };

  return (
    <OpportunitiesPage
      mode="freelancer"
      clientId={clientId}
      orgFocusAreas={clientFocusAreas}
      clientName={clientName}
      clientMission={clientMission}
      onBack={clientId ? handleBack : undefined}
    />
  );
}
