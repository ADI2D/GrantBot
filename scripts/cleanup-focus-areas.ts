#!/usr/bin/env tsx
/**
 * Comprehensive cleanup of focus_area values with batching to avoid timeouts
 * Handles abbreviations, JSON arrays, and mixed case
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
  console.error("Error: Missing environment variables");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✓" : "✗");
  process.exit(1);
}

const BATCH_SIZE = 50;

async function updateInBatches(supabase: any, fromValue: string, toValue: string) {
  let totalUpdated = 0;
  let hasMore = true;
  let iterations = 0;
  const maxIterations = 100; // Safety limit

  while (hasMore && iterations < maxIterations) {
    iterations++;

    // Fetch a batch of IDs
    const { data: batch, error: fetchError } = await supabase
      .from("opportunities")
      .select("id")
      .eq("focus_area", fromValue)
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error(`    Error fetching batch:`, fetchError.message);
      break;
    }

    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }

    // Update this batch
    const ids = batch.map((opp: any) => opp.id);
    const { error: updateError } = await supabase
      .from("opportunities")
      .update({ focus_area: toValue })
      .in("id", ids);

    if (updateError) {
      console.error(`    Error updating batch:`, updateError.message);
      break;
    }

    totalUpdated += batch.length;
    console.log(`    Updated batch of ${batch.length} (total: ${totalUpdated})`);

    // If we got fewer than BATCH_SIZE, we're done
    if (batch.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  return totalUpdated;
}

async function cleanupFocusAreas() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\n=== CLEANING UP FOCUS AREA VALUES ===\n");

  // Define all mappings
  const mappings = [
    { from: ["HL"], to: "Health & Wellness" },
    { from: ["ED"], to: "Education" },
    { from: ["ENV"], to: "Environment & Animals" },
    { from: ["NR", "ST", "RD"], to: "Research & Innovation" },
    { from: ["CD"], to: "Community Development" },
    { from: ["AR"], to: "Arts & Culture" },
    { from: ["EN"], to: "Energy" },
    { from: ["HU"], to: "Humanities" },
    { from: ["T"], to: "Transportation" },
    { from: ["DPR"], to: "Disaster Relief" },
    { from: ["ELT"], to: "Employment & Training" },
    { from: ["HO"], to: "Housing" },
    { from: ["LJL"], to: "Legal & Justice" },
    { from: ["FN"], to: "Food & Nutrition" },
    { from: ["ISS"], to: "Social Services" },
    { from: ["BC"], to: "Business & Commerce" },
    { from: ["AG"], to: "Agriculture" },
    { from: ["other", "O", "OZ"], to: "Other" },
  ];

  let totalUpdated = 0;

  // Process each mapping
  for (const mapping of mappings) {
    console.log(`\nConverting ${mapping.from.join(", ")} → "${mapping.to}"`);

    for (const fromValue of mapping.from) {
      const updated = await updateInBatches(supabase, fromValue, mapping.to);
      if (updated > 0) {
        console.log(`  ✓ Total updated from "${fromValue}": ${updated}`);
        totalUpdated += updated;
      }
    }
  }

  // Handle JSON arrays
  console.log("\n\nHandling JSON arrays (multi-category values)...");
  const { data: jsonArrays, error: fetchError } = await supabase
    .from("opportunities")
    .select("id")
    .like("focus_area", "[%");

  if (fetchError) {
    console.error("Error fetching JSON arrays:", fetchError);
  } else if (jsonArrays && jsonArrays.length > 0) {
    console.log(`Found ${jsonArrays.length} opportunities with JSON array focus areas`);

    // Update in batches
    for (let i = 0; i < jsonArrays.length; i += BATCH_SIZE) {
      const batch = jsonArrays.slice(i, i + BATCH_SIZE);
      const ids = batch.map((opp: any) => opp.id);

      const { error: updateError } = await supabase
        .from("opportunities")
        .update({ focus_area: "Other" })
        .in("id", ids);

      if (updateError) {
        console.error(`  ❌ Error updating batch ${i}-${i + BATCH_SIZE}:`, updateError.message);
      } else {
        console.log(`  ✓ Updated batch ${i + 1}-${Math.min(i + BATCH_SIZE, jsonArrays.length)}`);
        totalUpdated += batch.length;
      }
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Total updated: ${totalUpdated}`);

  // Show final distribution
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("focus_area");

  const distribution: Record<string, number> = {};
  opportunities?.forEach((opp: any) => {
    const category = opp.focus_area || "NULL";
    distribution[category] = (distribution[category] || 0) + 1;
  });

  console.log("\n=== FINAL DISTRIBUTION ===");
  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`${category.padEnd(30)} : ${count}`);
    });

  console.log("\n✓ Cleanup complete!");
  console.log("\nNext step: Run 'npm run recategorize' to recategorize the 'Other' opportunities");
}

cleanupFocusAreas().catch(console.error);
