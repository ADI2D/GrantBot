"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { OpportunitiesPage } from "@/components/opportunities/opportunities-page";

export const dynamic = "force-dynamic";

export default function FreelancerOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; search?: string }>;
}) {
  const params = use(searchParams);
  const clientId = params?.client ?? null;
  const router = useRouter();

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
      onBack={clientId ? handleBack : undefined}
    />
  );
}
