"use client";

import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

type ComplianceSummaryProps = {
  summary: {
    totalRequirements: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    riskScore: number;
  };
  className?: string;
};

export function ComplianceSummary({ summary, className }: ComplianceSummaryProps) {
  const { totalRequirements, highRisk, mediumRisk, lowRisk, riskScore } = summary;

  // Determine overall risk level
  let riskLevel: "low" | "medium" | "high" = "low";
  let riskColor = "text-emerald-600";
  let riskBg = "bg-emerald-50";
  let riskLabel = "Low Risk";

  if (riskScore >= 60) {
    riskLevel = "high";
    riskColor = "text-red-600";
    riskBg = "bg-red-50";
    riskLabel = "High Risk";
  } else if (riskScore >= 30) {
    riskLevel = "medium";
    riskColor = "text-amber-600";
    riskBg = "bg-amber-50";
    riskLabel = "Medium Risk";
  }

  if (totalRequirements === 0) {
    return (
      <Card className={`p-5 ${className || ""}`}>
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600">No compliance data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-5 ${className || ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase text-slate-500 font-semibold">
            Compliance Risk
          </p>
          <p className={`text-2xl font-bold ${riskColor} mt-1`}>
            {riskScore}
            <span className="text-sm font-normal text-slate-500">/100</span>
          </p>
        </div>
        <div className={`p-3 rounded-full ${riskBg}`}>
          {riskLevel === "high" && <AlertTriangle className={`h-6 w-6 ${riskColor}`} />}
          {riskLevel === "medium" && <Shield className={`h-6 w-6 ${riskColor}`} />}
          {riskLevel === "low" && <CheckCircle2 className={`h-6 w-6 ${riskColor}`} />}
        </div>
      </div>

      <div className={`rounded-lg px-3 py-2 mb-4 ${riskBg}`}>
        <p className={`text-sm font-medium ${riskColor}`}>{riskLabel}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {getRiskMessage(riskLevel, highRisk)}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total Requirements</span>
          <span className="font-semibold text-slate-900">{totalRequirements}</span>
        </div>

        {highRisk > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-slate-600">High Risk</span>
            </div>
            <span className="font-semibold text-red-600">{highRisk}</span>
          </div>
        )}

        {mediumRisk > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-slate-600">Medium Risk</span>
            </div>
            <span className="font-semibold text-amber-600">{mediumRisk}</span>
          </div>
        )}

        {lowRisk > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Low Risk</span>
            </div>
            <span className="font-semibold text-emerald-600">{lowRisk}</span>
          </div>
        )}
      </div>

      {/* Risk Bar */}
      <div className="mt-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getRiskBarColor(riskLevel)} transition-all duration-500`}
            style={{ width: `${riskScore}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
}

function getRiskMessage(level: string, highRiskCount: number): string {
  if (level === "high") {
    return `${highRiskCount} critical requirement${highRiskCount !== 1 ? "s" : ""} require immediate attention`;
  }
  if (level === "medium") {
    return "Some requirements need careful review before proceeding";
  }
  return "All requirements appear manageable with standard preparation";
}

function getRiskBarColor(level: string): string {
  if (level === "high") return "bg-red-500";
  if (level === "medium") return "bg-amber-500";
  return "bg-emerald-500";
}
