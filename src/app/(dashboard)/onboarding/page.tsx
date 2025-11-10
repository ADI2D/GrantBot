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
    // Fetch user's account type and existing data (for edit mode)
    const fetchUserData = async () => {
      try {
        // Get user profile to determine account type
        const profileResponse = await fetch("/api/user/profile");
        if (!profileResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }
        const profileData = await profileResponse.json();
        const userAccountType = profileData.accountType;
        setAccountType(userAccountType);

        // Try to get saved onboarding progress first
        const progressResponse = await fetch("/api/onboarding/progress");
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          if (progressData.progress?.data) {
            setSavedProgress(progressData.progress);
            return; // Use progress data if available
          }
        }

        // If no progress, try to load existing completed data for edit mode
        if (userAccountType === "nonprofit") {
          const orgResponse = await fetch("/api/organization");
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.organization) {
              // Map organization data to wizard format
              setSavedProgress({
                data: {
                  name: orgData.organization.name,
                  mission: orgData.organization.mission,
                  impact_summary: orgData.organization.impact_summary,
                  differentiator: orgData.organization.differentiator,
                  annual_budget: orgData.organization.annual_budget,
                  focus_areas: orgData.organization.focus_areas || [],
                  ein: orgData.organization.ein,
                  founded_year: orgData.organization.founded_year,
                  staff_size: orgData.organization.staff_size,
                  geographic_scope: orgData.organization.geographic_scope,
                  website: orgData.organization.website,
                  programs: orgData.organization.programs || [],
                  impact_metrics: orgData.organization.impact_metrics || [],
                  target_demographics: orgData.organization.target_demographics || [],
                  past_funders: orgData.organization.past_funders || [],
                  documents: orgData.organization.documents || [],
                },
              });
            }
          }
        } else if (userAccountType === "freelancer") {
          // Fetch freelancer profile data for edit mode
          const freelancerResponse = await fetch("/api/freelancer/profile");
          if (freelancerResponse.ok) {
            const freelancerData = await freelancerResponse.json();
            if (freelancerData.profile) {
              // Map freelancer profile data to wizard format
              const profile = freelancerData.profile;
              const clients = freelancerData.clients || [];

              setSavedProgress({
                data: {
                  full_name: profile.full_name,
                  headline: profile.headline,
                  bio: profile.bio,
                  hourly_rate: profile.hourly_rate,
                  years_experience: profile.years_experience,
                  specializations: profile.specializations || [],
                  certifications: profile.certifications || [],
                  portfolio_items: profile.portfolio_items || [],
                  total_grants_written: profile.total_grants_written,
                  total_amount_raised: profile.total_amount_raised,
                  success_rate: profile.success_rate,
                  availability_status: profile.availability_status,
                  weekly_capacity: profile.weekly_capacity,
                  clients: clients.map((client: any) => ({
                    id: client.id,
                    client_name: client.name,
                    like_us: client.like_us || false,
                    categories: client.categories || [],
                  })),
                },
              });
            }
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
