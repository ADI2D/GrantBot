"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FocusAreaSelect } from "@/components/ui/focus-area-select";
import type { FocusAreaId } from "@/types/focus-areas";

export default function NewFreelancerClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    primaryContactName: "",
    primaryContactEmail: "",
    mission: "",
    annualBudget: "",
    billingRate: "",
  });

  const [focusAreas, setFocusAreas] = useState<FocusAreaId[]>([]);
  const [primaryFocusArea, setPrimaryFocusArea] = useState<string>("");
  const [focusDescription, setFocusDescription] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate focus areas
    if (focusAreas.length === 0) {
      setError("Please select at least one focus area");
      return;
    }

    if (focusAreas.length > 5) {
      setError("Please select a maximum of 5 focus areas");
      return;
    }

    if (primaryFocusArea && !focusAreas.includes(primaryFocusArea as FocusAreaId)) {
      setError("Primary focus area must be one of the selected focus areas");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/freelancer/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          primaryContactName: formData.primaryContactName || null,
          primaryContactEmail: formData.primaryContactEmail || null,
          mission: formData.mission || null,
          annualBudget: formData.annualBudget ? parseInt(formData.annualBudget, 10) : null,
          focusAreas: focusAreas,
          primaryFocusArea: primaryFocusArea || focusAreas[0], // Default to first if not specified
          focusDescription: focusDescription || null,
          billingRate: formData.billingRate ? parseFloat(formData.billingRate) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create client");
      }

      const { client } = await response.json();
      router.push(`/freelancer/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/freelancer/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to clients
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Add new client</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a client profile to manage opportunities, proposals, and documents.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Organization information</h2>
            <p className="text-sm text-slate-600">Basic details about the client organization.</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                Organization name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Impact Circle Foundation"
              />
            </div>

            <div>
              <Label htmlFor="mission">Mission statement</Label>
              <Textarea
                id="mission"
                name="mission"
                value={formData.mission}
                onChange={handleChange}
                placeholder="Describe the organization's mission and purpose"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="annualBudget">Annual budget (USD)</Label>
              <Input
                id="annualBudget"
                name="annualBudget"
                type="number"
                value={formData.annualBudget}
                onChange={handleChange}
                placeholder="e.g., 500000"
              />
              <p className="mt-1 text-xs text-slate-500">Enter the amount in dollars without commas</p>
            </div>

            <div>
              <Label htmlFor="focusAreas">
                Focus areas <span className="text-red-500">*</span>
              </Label>
              <FocusAreaSelect
                selectedAreas={focusAreas}
                onChange={setFocusAreas}
                maxSelections={5}
              />
              <p className="mt-1 text-xs text-slate-500">
                Select 1-5 focus areas that describe this client's work
              </p>
            </div>

            {focusAreas.length > 0 && (
              <div>
                <Label htmlFor="primaryFocusArea">Primary focus area</Label>
                <select
                  id="primaryFocusArea"
                  value={primaryFocusArea}
                  onChange={(e) => setPrimaryFocusArea(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select primary focus...</option>
                  {focusAreas.map((area) => (
                    <option key={area} value={area}>
                      {area.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Used for matching boost - helps prioritize relevant opportunities
                </p>
              </div>
            )}

            {focusAreas.length > 0 && (
              <div>
                <Label htmlFor="focusDescription">Focus description (optional)</Label>
                <Textarea
                  id="focusDescription"
                  name="focusDescription"
                  value={focusDescription}
                  onChange={(e) => setFocusDescription(e.target.value)}
                  placeholder="Brief description of the client's specific focus within these areas..."
                  rows={2}
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {focusDescription.length}/200 characters - Provides context for grant writers
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="billingRate">Billing rate ($/hour)</Label>
              <Input
                id="billingRate"
                name="billingRate"
                type="number"
                step="0.01"
                value={formData.billingRate}
                onChange={handleChange}
                placeholder="e.g., 150"
              />
              <p className="mt-1 text-xs text-slate-500">Your hourly rate for this client</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Primary contact</h2>
            <p className="text-sm text-slate-600">
              Main point of contact for this organization (optional).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="primaryContactName">Contact name</Label>
              <Input
                id="primaryContactName"
                name="primaryContactName"
                value={formData.primaryContactName}
                onChange={handleChange}
                placeholder="e.g., Jane Smith"
              />
            </div>

            <div>
              <Label htmlFor="primaryContactEmail">Contact email</Label>
              <Input
                id="primaryContactEmail"
                name="primaryContactEmail"
                type="email"
                value={formData.primaryContactEmail}
                onChange={handleChange}
                placeholder="e.g., jane@impactcircle.org"
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Link
            href="/freelancer/clients"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating client...
              </>
            ) : (
              "Create client"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
