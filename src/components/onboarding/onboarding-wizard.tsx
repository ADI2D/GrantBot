"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
};

export type StepProps = {
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  isFirst: boolean;
  isLast: boolean;
  data: Record<string, any>;
  updateData: (updates: Record<string, any>) => void;
};

type OnboardingWizardProps = {
  steps: OnboardingStep[];
  accountType: "nonprofit" | "freelancer";
  onComplete: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
};

export default function OnboardingWizard({
  steps,
  accountType,
  onComplete,
  initialData = {},
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Autosave every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (Object.keys(formData).length > 0) {
        saveProgress();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [formData]);

  const saveProgress = async () => {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          step: currentStep.id,
          data: formData,
          completion: progress,
        }),
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  };

  const updateData = (updates: Record<string, any>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const handleNext = async () => {
    await saveProgress();

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Last step - complete onboarding
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onComplete(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
      setIsSubmitting(false);
    }
  };

  const StepComponent = currentStep.component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200 z-50">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome to GrantSpec</h1>
              <p className="text-sm text-slate-600 mt-1">
                Let's get your {accountType === "nonprofit" ? "organization" : "profile"} set up
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">
                Step {currentStepIndex + 1} of {totalSteps}
              </div>
              <div className="text-xs text-slate-500 mt-1">{Math.round(progress)}% complete</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Step Navigation */}
        <nav className="mb-12">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isUpcoming = index > currentStepIndex;

              return (
                <li key={step.id} className="flex-1">
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isCompleted
                          ? "bg-blue-600 border-blue-600 text-white"
                          : isCurrent
                            ? "bg-white border-blue-600 text-blue-600"
                            : "bg-white border-slate-300 text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          isCompleted ? "bg-blue-600" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className="mt-2 hidden sm:block">
                    <p
                      className={`text-xs font-medium ${
                        isCurrent ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">{currentStep.title}</h2>
            <p className="text-slate-600">{currentStep.description}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <StepComponent
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              isFirst={currentStepIndex === 0}
              isLast={currentStepIndex === totalSteps - 1}
              data={formData}
              updateData={updateData}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {currentStepIndex < totalSteps - 1 && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Skip for now
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-8 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Completing...
                  </span>
                ) : currentStepIndex === totalSteps - 1 ? (
                  "Complete Setup"
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Auto-save indicator */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Your progress is automatically saved every 30 seconds
          </p>
        </div>
      </main>
    </div>
  );
}
