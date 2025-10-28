"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, UploadCloud, Trash2 } from "lucide-react";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { useOrganizationProfile } from "@/hooks/use-api";
import { useOrg } from "@/hooks/use-org";
import type { DocumentMeta } from "@/types/api";

const steps = [
  { label: "Org profile", description: "Mission, EIN, budget" },
  { label: "Programs", description: "Service areas & metrics" },
  { label: "Supporting docs", description: "Financials, 990, board" },
  { label: "AI preferences", description: "Tone, reviewers, guardrails" },
];

type OrgProfile = {
  organizationName: string;
  mission: string;
  budget: string;
  impact: string;
  differentiator: string;
};

export default function OnboardingPage() {
  const { data, isLoading, error } = useOrganizationProfile();
  const { currentOrgId } = useOrg();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<OrgProfile>({
    organizationName: "",
    mission: "",
    budget: "",
    impact: "",
    differentiator: "",
  });
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [newDocument, setNewDocument] = useState<DocumentMeta>({ title: "", status: "Ready" });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.organization) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill the form once when data loads
      setProfile({
        organizationName: data.organization.name,
        mission: data.organization.mission ?? "",
        budget: data.organization.annualBudget
          ? `$${Number(data.organization.annualBudget).toLocaleString()} annual operating budget`
          : "",
        impact: data.organization.impactSummary ?? "",
        differentiator: data.organization.differentiator ?? "",
      });
      setDocuments(data.organization.documents ?? []);
    }
  }, [data]);

  const handleChange = (field: keyof OrgProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async (payload: {
      organizationName: string;
      mission: string;
      impact: string;
      differentiator: string;
      budget: string;
      documents: DocumentMeta[];
    }) => {
      const response = await fetch(`/api/organization?orgId=${currentOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      setStatusMessage("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["organization", currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentOrgId] });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (mutationError) => {
      setStatusMessage(mutationError instanceof Error ? mutationError.message : "Save failed");
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      ...profile,
      documents,
    });
  };

  const handleAddDocument = () => {
    if (!newDocument.title.trim()) return;
    setDocuments((prev) => [...prev, newDocument]);
    setNewDocument({ title: "", status: "Ready" });
  };

  const handleRemoveDocument = (title: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.title !== title));
  };

  if (isLoading) return <PageLoader label="Loading profile" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load profile"} />;

  const completion = Math.round(data.organization.onboardingCompletion * 100);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Onboarding</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Capture your institutional knowledge once.
          </h1>
          <p className="text-sm text-slate-600">
            GrantBot reuses this data across every AI draft, compliance checklist, and board report.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="info">{completion}% complete</Badge>
          {statusMessage && <p className="text-sm text-slate-500">{statusMessage}</p>}
          <Button type="submit" form="onboarding-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save progress"}
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card className="p-6">
          <p className="text-xs uppercase text-slate-500">Implementation plan</p>
          <div className="mt-4 space-y-4">
            {steps.map((step, index) => (
              <div key={step.label} className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    completion / 25 > index
                      ? "bg-blue-600 text-white"
                      : completion / 25 === index
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{step.label}</p>
                  <p className="text-sm text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Need concierge onboarding?</p>
            <p>Upload existing decks or PDFs and GrantBot will pre-fill your workspace.</p>
          </div>
        </Card>

        <Card className="p-6">
          <form id="onboarding-form" className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Organization name</label>
              <Input
                value={profile.organizationName}
                onChange={(event) => handleChange("organizationName", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mission statement</label>
              <Textarea
                rows={3}
                value={profile.mission}
                onChange={(event) => handleChange("mission", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Annual budget summary</label>
              <Textarea
                rows={2}
                value={profile.budget}
                onChange={(event) => handleChange("budget", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Impact snapshot</label>
              <Textarea
                rows={3}
                value={profile.impact}
                onChange={(event) => handleChange("impact", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Differentiators & lived experience</label>
              <Textarea
                rows={2}
                value={profile.differentiator}
                onChange={(event) => handleChange("differentiator", event.target.value)}
              />
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Document vault</p>
                  <p className="text-xs text-slate-500">
                    Track which compliance artifacts are ready before exporting proposals.
                  </p>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Document title (e.g., IRS 990)"
                    value={newDocument.title}
                    onChange={(event) =>
                      setNewDocument((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="URL or storage path"
                    value={newDocument.url ?? ""}
                    onChange={(event) =>
                      setNewDocument((prev) => ({ ...prev, url: event.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Status (Ready / Missing)"
                    value={newDocument.status ?? ""}
                    onChange={(event) =>
                      setNewDocument((prev) => ({ ...prev, status: event.target.value }))
                    }
                  />
                  <Button type="button" variant="secondary" onClick={handleAddDocument}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Add document
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {documents.length === 0 && (
                  <p className="text-xs text-slate-500">No documents tracked yet.</p>
                )}
                {documents.map((doc) => (
                  <div
                    key={doc.title}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {doc.status ?? "Status unknown"}
                        {doc.url ? ` • ${doc.url}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-500"
                      onClick={() => handleRemoveDocument(doc.title)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Changes save to Supabase
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Mark section complete"}
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
