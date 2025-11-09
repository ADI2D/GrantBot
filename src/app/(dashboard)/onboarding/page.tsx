"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingWizard, { type OnboardingStep } from "@/components/onboarding/onboarding-wizard";
import { PageLoader, PageError } from "@/components/ui/page-state";

// Import nonprofit steps
import BasicInfoStep from "@/components/onboarding/steps/nonprofit/basic-info";
import MissionImpactStep from "@/components/onboarding/steps/nonprofit/mission-impact";
import BudgetFinanceStep from "@/components/onboarding/steps/nonprofit/budget-finance";
import ProgramsMetricsStep from "@/components/onboarding/steps/nonprofit/programs-metrics";
import DocumentsReviewStep from "@/components/onboarding/steps/nonprofit/documents-review";

// Import freelancer steps
import BasicProfileStep from "@/components/onboarding/steps/freelancer/basic-profile";
import ExpertiseStep from "@/components/onboarding/steps/freelancer/expertise";
import PortfolioStep from "@/components/onboarding/steps/freelancer/portfolio";
import ClientsStep from "@/components/onboarding/steps/freelancer/clients";

const nonprofitSteps: OnboardingStep[] = [
  {
    id: "basic-info",
    title: "Basic Info",
    description: "Tell us about your organization",
    component: BasicInfoStep,
  },
  {
    id: "mission-impact",
    title: "Mission & Impact",
    description: "Share your mission and focus areas",
    component: MissionImpactStep,
  },
  {
    id: "budget-finance",
    title: "Budget & Finance",
    description: "Financial information and past funding",
    component: BudgetFinanceStep,
  },
  {
    id: "programs-metrics",
    title: "Programs & Metrics",
    description: "Your programs and impact data",
    component: ProgramsMetricsStep,
  },
  {
    id: "documents-review",
    title: "Documents & Review",
    description: "Upload documents and review your profile",
    component: DocumentsReviewStep,
  },
];

const freelancerSteps: OnboardingStep[] = [
  {
    id: "basic-profile",
    title: "Basic Profile",
    description: "Your professional information",
    component: BasicProfileStep,
  },
  {
    id: "expertise",
    title: "Expertise",
    description: "Your specializations and credentials",
    component: ExpertiseStep,
  },
  {
    id: "portfolio",
    title: "Portfolio",
    description: "Showcase your past work",
    component: PortfolioStep,
  },
  {
    id: "clients",
    title: "Clients",
    description: "Your client list and relationships",
    component: ClientsStep,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"nonprofit" | "freelancer" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<any>(null);

  useEffect(() => {
    // Fetch user's account type and saved progress
    const fetchUserData = async () => {
      try {
        // Get user profile to determine account type
        const profileResponse = await fetch("/api/user/profile");
        if (!profileResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }
        const profileData = await profileResponse.json();
        setAccountType(profileData.accountType);

        // Get saved onboarding progress
        const progressResponse = await fetch("/api/onboarding/progress");
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          if (progressData.progress) {
            setSavedProgress(progressData.progress);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load onboarding data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleComplete = async (data: Record<string, any>) => {
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountType, data }),
    });

    if (response.ok) {
      // Redirect to appropriate dashboard based on account type
      if (accountType === "nonprofit") {
        router.push("/dashboard");
      } else {
        router.push("/freelancer/opportunities");
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to complete onboarding");
    }
  };

  if (isLoading) {
    return <PageLoader label="Loading onboarding..." />;
  }

  if (error) {
    return <PageError message={error} />;
  }

  if (!accountType) {
    return <PageError message="Unable to determine account type. Please contact support." />;
  }

  const steps = accountType === "nonprofit" ? nonprofitSteps : freelancerSteps;

  return (
    <OnboardingWizard
      steps={steps}
      accountType={accountType}
      onComplete={handleComplete}
      initialData={savedProgress?.data}
    />
  );
}
