"use client";

import { AlertTriangle, CheckCircle2, Flag, Info, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ComplianceRequirement = {
  requirementText: string;
  requirementType: string;
  riskLevel: string;
  deadline?: string;
  autoExtracted: boolean;
  confidenceScore: number;
  suggestedAction?: string;
};

type RequirementListProps = {
  requirements: ComplianceRequirement[];
  onExtract?: () => void;
  loading?: boolean;
};

export function RequirementList({ requirements, onExtract, loading }: RequirementListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Extracting compliance requirements...</p>
        </div>
      </div>
    );
  }

  if (requirements.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 mb-4">No compliance requirements extracted yet</p>
        {onExtract && (
          <button
            onClick={onExtract}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Extract Requirements
          </button>
        )}
      </div>
    );
  }

  // Group by type
  const grouped = requirements.reduce((acc, req) => {
    if (!acc[req.requirementType]) {
      acc[req.requirementType] = [];
    }
    acc[req.requirementType].push(req);
    return acc;
  }, {} as { [key: string]: ComplianceRequirement[] });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, reqs]) => (
        <div key={type}>
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-3">
            {getTypeLabel(type)}
          </h3>
          <div className="space-y-3">
            {reqs.map((req, index) => (
              <RequirementCard key={`${type}-${index}`} requirement={req} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RequirementCard({ requirement }: { requirement: ComplianceRequirement }) {
  const riskLevel = requirement.riskLevel;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Risk Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {riskLevel === "high" && (
            <ShieldAlert className="h-5 w-5 text-red-500" />
          )}
          {riskLevel === "medium" && (
            <Shield className="h-5 w-5 text-amber-500" />
          )}
          {riskLevel === "low" && (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm text-slate-900 leading-relaxed">
              {requirement.requirementText}
            </p>
            <RiskBadge level={riskLevel} />
          </div>

          {/* Suggested Action */}
          {requirement.suggestedAction && (
            <div className="flex items-start gap-2 mt-2 rounded-lg bg-blue-50 px-3 py-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                <span className="font-medium">Action: </span>
                {requirement.suggestedAction}
              </p>
            </div>
          )}

          {/* Deadline */}
          {requirement.deadline && (
            <div className="flex items-center gap-2 mt-2">
              <Flag className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">
                Deadline: {new Date(requirement.deadline).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            {requirement.autoExtracted && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Auto-extracted
              </span>
            )}
            {requirement.confidenceScore > 0 && (
              <span>
                {Math.round(requirement.confidenceScore * 100)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RiskBadge({ level }: { level: string }) {
  if (level === "high") {
    return (
      <Badge tone="danger" className="flex-shrink-0">
        <AlertTriangle className="h-3 w-3 mr-1" />
        High Risk
      </Badge>
    );
  }

  if (level === "medium") {
    return (
      <Badge tone="warning" className="flex-shrink-0">
        Medium Risk
      </Badge>
    );
  }

  return (
    <Badge tone="default" className="flex-shrink-0">
      Low Risk
    </Badge>
  );
}

function getTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    eligibility: "Eligibility Requirements",
    document: "Required Documents",
    narrative: "Narrative Requirements",
    operational: "Operational Requirements",
    deadline: "Deadlines & Timeline",
    other: "Other Requirements",
  };
  return labels[type] || type;
}
