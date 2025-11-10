#!/usr/bin/env tsx
/**
 * Check compliance extraction status and risk score distribution
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local
try {
  const envPath = resolve(__dirname, "../.env.local");
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");
    if (key && value) process.env[key] = value;
  });
} catch (error) {
  console.error("Error loading .env.local:", error);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log("=== COMPLIANCE STATUS CHECK ===\n");

  // Check total opportunities
  const { count: totalOpps } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Total Opportunities: ${totalOpps?.toLocaleString()}\n`);

  // Check extraction status
  const { count: extracted } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("compliance_extracted", true);

  console.log(`✅ Extracted: ${extracted?.toLocaleString()}`);
  console.log(`⏳ Not Extracted: ${((totalOpps || 0) - (extracted || 0)).toLocaleString()}\n`);

  // Check risk score distribution
  const { count: withRiskScores } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .not("compliance_risk_score", "is", null);

  console.log(`📈 With Risk Scores: ${withRiskScores?.toLocaleString()}`);
  console.log(`❌ Without Risk Scores: ${((totalOpps || 0) - (withRiskScores || 0)).toLocaleString()}\n`);

  // Get risk score breakdown
  console.log("📊 Risk Score Distribution:\n");

  const { data: lowRisk } = await supabase
    .from("opportunities")
    .select("id")
    .gte("compliance_risk_score", 0)
    .lt("compliance_risk_score", 30);

  const { data: mediumRisk } = await supabase
    .from("opportunities")
    .select("id")
    .gte("compliance_risk_score", 30)
    .lt("compliance_risk_score", 60);

  const { data: highRisk } = await supabase
    .from("opportunities")
    .select("id")
    .gte("compliance_risk_score", 60);

  console.log(`🟢 Low Risk (0-29):      ${lowRisk?.length || 0}`);
  console.log(`🟡 Medium Risk (30-59):  ${mediumRisk?.length || 0}`);
  console.log(`🔴 High Risk (60+):      ${highRisk?.length || 0}\n`);

  // Check total requirements extracted
  const { count: totalReqs } = await supabase
    .from("compliance_requirements")
    .select("*", { count: "exact", head: true });

  console.log(`📋 Total Requirements Extracted: ${totalReqs?.toLocaleString()}\n`);

  // Sample opportunities with risk scores
  console.log("📄 Sample Opportunities with Risk Scores:\n");

  const { data: samples } = await supabase
    .from("opportunities")
    .select("name, compliance_risk_score, deadline")
    .not("compliance_risk_score", "is", null)
    .order("compliance_risk_score", { ascending: false })
    .limit(5);

  if (samples && samples.length > 0) {
    samples.forEach((opp) => {
      const riskLevel =
        (opp.compliance_risk_score ?? 0) >= 60
          ? "🔴 HIGH"
          : (opp.compliance_risk_score ?? 0) >= 30
            ? "🟡 MED"
            : "🟢 LOW";
      console.log(`${riskLevel} [${opp.compliance_risk_score}/100] ${opp.name.substring(0, 60)}...`);
    });
  } else {
    console.log("No opportunities with risk scores found.");
  }

  console.log("\n");

  // Check if any visible opportunities have risk scores
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const { data: visibleWithScores } = await supabase
    .from("opportunities")
    .select("id")
    .not("status", "ilike", "closed")
    .or(`deadline.gte.${todayStr},deadline.is.null`)
    .not("compliance_risk_score", "is", null)
    .limit(1000);

  console.log(`👀 Visible Opportunities (deadline >= today) with Risk Scores: ${visibleWithScores?.length || 0}\n`);

  if ((visibleWithScores?.length || 0) === 0) {
    console.log("⚠️  WARNING: No visible opportunities have risk scores!");
    console.log("   This means either:");
    console.log("   1. No visible opportunities have compliance_notes/eligibility_requirements");
    console.log("   2. Extraction didn't find any requirements in the text");
    console.log("   3. The trigger to calculate risk scores didn't fire\n");

    // Check a sample visible opportunity
    const { data: sampleVisible } = await supabase
      .from("opportunities")
      .select("id, name, compliance_notes, eligibility_requirements, compliance_extracted, compliance_risk_score")
      .not("status", "ilike", "closed")
      .or(`deadline.gte.${todayStr},deadline.is.null`)
      .limit(1)
      .single();

    if (sampleVisible) {
      console.log("📋 Sample Visible Opportunity:");
      console.log(`   Name: ${sampleVisible.name}`);
      console.log(`   Extracted: ${sampleVisible.compliance_extracted}`);
      console.log(`   Risk Score: ${sampleVisible.compliance_risk_score}`);
      console.log(`   Has compliance_notes: ${!!sampleVisible.compliance_notes}`);
      console.log(`   Has eligibility_requirements: ${!!sampleVisible.eligibility_requirements}\n`);

      // Check if it has requirements
      const { count: reqCount } = await supabase
        .from("compliance_requirements")
        .select("*", { count: "exact", head: true })
        .eq("opportunity_id", sampleVisible.id);

      console.log(`   Requirements in DB: ${reqCount}\n`);
    }
  }
}

checkStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
