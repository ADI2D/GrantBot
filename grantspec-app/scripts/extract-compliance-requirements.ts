#!/usr/bin/env tsx

/**
 * Extract Compliance Requirements
 * Backfills compliance requirements for existing opportunities
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ComplianceExtractor } from "../src/lib/compliance/extractor";

// Load environment variables from .env.local
try {
  const envPath = resolve(__dirname, "../.env.local");
  const envContent = readFileSync(envPath, "utf-8");

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");

    if (key && value) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error("Error loading .env.local:", error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 100; // Process 100 opportunities at a time

async function main() {
  console.log("=== EXTRACTING COMPLIANCE REQUIREMENTS ===\n");

  try {
    // Get total count of opportunities
    const { count: totalCount, error: countError } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw new Error(`Failed to count opportunities: ${countError.message}`);
    }

    console.log(`Found ${totalCount?.toLocaleString()} total opportunities\n`);

    // Check how many already have extraction
    const { count: extractedCount } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("compliance_extracted", true);

    const remainingCount = (totalCount || 0) - (extractedCount || 0);

    console.log(`Already extracted: ${extractedCount?.toLocaleString()}`);
    console.log(`Remaining: ${remainingCount.toLocaleString()}\n`);

    if (remainingCount === 0) {
      console.log("✅ All opportunities already have compliance extraction!\n");
      return;
    }

    // Prompt for confirmation
    const batchCount = Math.ceil(remainingCount / BATCH_SIZE);
    console.log(`This will process ${remainingCount.toLocaleString()} opportunities in ${batchCount} batches`);
    console.log(`Batch size: ${BATCH_SIZE}\n`);

    // Initialize extractor
    const extractor = new ComplianceExtractor(supabase);
    await extractor.loadRules();
    console.log("✅ Loaded compliance rules\n");

    let batchNumber = 1;
    let totalProcessed = 0;
    let totalRequirementsExtracted = 0;

    while (true) {
      console.log(`\n--- Processing batch ${batchNumber} ---`);

      // Fetch opportunities without extraction
      const { data: opportunities, error: fetchError } = await supabase
        .from("opportunities")
        .select("id, name, compliance_notes, raw_data")
        .eq("compliance_extracted", false)
        .limit(BATCH_SIZE);

      if (fetchError) {
        throw new Error(`Failed to fetch opportunities: ${fetchError.message}`);
      }

      if (!opportunities || opportunities.length === 0) {
        console.log("\n✅ No more opportunities to process\n");
        break;
      }

      console.log(`Fetched ${opportunities.length} opportunities`);

      // Process each opportunity
      let batchExtracted = 0;
      for (const opp of opportunities) {
        try {
          // Extract text from raw_data
          let fullText = "";
          if (opp.raw_data) {
            const rawData = opp.raw_data as any;
            fullText = rawData.synopsis || rawData.description || rawData.opportunityTitle || "";
          }

          // Extract requirements
          const result = await extractor.extractRequirements(fullText, opp.compliance_notes);

          // Store requirements
          if (result.requirements.length > 0) {
            await extractor.storeRequirements(opp.id, result.requirements);
            batchExtracted += result.requirements.length;
          } else {
            // Mark as extracted even if no requirements found
            await supabase
              .from("opportunities")
              .update({
                compliance_extracted: true,
                compliance_extracted_at: new Date().toISOString(),
              })
              .eq("id", opp.id);
          }

          totalProcessed++;
        } catch (error) {
          console.error(`  ⚠️  Error processing ${opp.name}:`, error);
        }
      }

      totalRequirementsExtracted += batchExtracted;

      console.log(`  Processed: ${opportunities.length} opportunities`);
      console.log(`  Extracted: ${batchExtracted} requirements`);
      console.log(`  Progress: ${totalProcessed.toLocaleString()} / ${remainingCount.toLocaleString()}`);

      batchNumber++;

      // Small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n=== EXTRACTION COMPLETE ===\n");
    console.log(`✅ Processed ${totalProcessed.toLocaleString()} opportunities`);
    console.log(`📊 Extracted ${totalRequirementsExtracted.toLocaleString()} total requirements`);
    console.log(`📊 Average: ${Math.round(totalRequirementsExtracted / totalProcessed)} requirements per opportunity\n`);

    // Get summary stats
    console.log("=== SUMMARY STATISTICS ===\n");

    const { count: highRiskCount } = await supabase
      .from("compliance_requirements")
      .select("*", { count: "exact", head: true })
      .eq("risk_level", "high");

    const { count: mediumRiskCount } = await supabase
      .from("compliance_requirements")
      .select("*", { count: "exact", head: true })
      .eq("risk_level", "medium");

    const { count: lowRiskCount } = await supabase
      .from("compliance_requirements")
      .select("*", { count: "exact", head: true })
      .eq("risk_level", "low");

    console.log(`High risk requirements: ${highRiskCount?.toLocaleString()}`);
    console.log(`Medium risk requirements: ${mediumRiskCount?.toLocaleString()}`);
    console.log(`Low risk requirements: ${lowRiskCount?.toLocaleString()}\n`);

    // Get type breakdown
    const { data: typeBreakdown } = await supabase
      .from("compliance_requirements")
      .select("requirement_type")
      .order("requirement_type");

    if (typeBreakdown) {
      const typeCounts: { [key: string]: number } = {};
      typeBreakdown.forEach((req) => {
        typeCounts[req.requirement_type] = (typeCounts[req.requirement_type] || 0) + 1;
      });

      console.log("Requirements by type:");
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count.toLocaleString()}`);
      });
      console.log("");
    }
  } catch (error) {
    console.error("❌ Extraction failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
