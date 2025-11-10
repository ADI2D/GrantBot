#!/usr/bin/env tsx
/**
 * Extract compliance requirements for a sample of opportunities (quick test)
 */

import { createClient } from "@supabase/supabase-js";
import { ComplianceExtractor } from "../src/lib/compliance/extractor";
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

async function extractSample() {
  console.log("🔍 Fetching sample opportunities (limit 10)...\n");

  // Fetch 10 opportunities with text to analyze
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("id, name, compliance_notes, eligibility_requirements")
    .not("compliance_notes", "is", null)
    .limit(10);

  if (error) {
    console.error("Error fetching opportunities:", error);
    process.exit(1);
  }

  if (!opportunities || opportunities.length === 0) {
    console.log("No opportunities found with compliance notes.");
    return;
  }

  console.log(`Found ${opportunities.length} opportunities to process.\n`);

  const extractor = new ComplianceExtractor(supabase);
  await extractor.loadRules();
  console.log("✅ Loaded compliance rules\n");

  let totalRequirements = 0;

  for (const opp of opportunities) {
    console.log(`📄 Processing: ${opp.name}`);

    // Build text to analyze
    const textToAnalyze = [opp.name, opp.eligibility_requirements, opp.compliance_notes]
      .filter(Boolean)
      .join("\n\n");

    if (!textToAnalyze.trim()) {
      console.log("   ⚠️  No text to analyze, skipping\n");
      continue;
    }

    try {
      // Extract requirements
      const result = await extractor.extractRequirements(textToAnalyze, opp.compliance_notes || "");

      if (result.requirements.length === 0) {
        console.log("   ℹ️  No requirements found\n");
        continue;
      }

      // Store requirements
      await extractor.storeRequirements(opp.id, result.requirements);

      // Get summary
      const summary = await extractor.getSummary(opp.id);

      console.log(`   ✅ Extracted ${result.requirements.length} requirements`);
      console.log(`   📊 Risk Score: ${summary.riskScore}/100`);
      console.log(
        `   📋 Breakdown: ${summary.highRisk} high, ${summary.mediumRisk} medium, ${summary.lowRisk} low\n`
      );

      totalRequirements += result.requirements.length;
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      console.log();
    }
  }

  console.log("✅ COMPLETE");
  console.log(`Processed ${opportunities.length} opportunities`);
  console.log(`Extracted ${totalRequirements} total requirements\n`);
}

extractSample()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
