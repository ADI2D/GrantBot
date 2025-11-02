#!/usr/bin/env tsx

/**
 * Backfill Search Vectors
 * Updates search_vector for all existing opportunities in batches
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
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 5000; // Process 5000 records at a time

async function main() {
  console.log("=== BACKFILLING SEARCH VECTORS ===\n");

  try {
    // Get total count of records needing backfill
    const { count: totalCount, error: countError } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .is("search_vector", null);

    if (countError) {
      throw new Error(`Failed to count records: ${countError.message}`);
    }

    if (totalCount === 0) {
      console.log("✅ All records already have search vectors!");
      console.log("Nothing to backfill.\n");
      return;
    }

    console.log(`Found ${totalCount?.toLocaleString()} records to backfill\n`);
    console.log(`Batch size: ${BATCH_SIZE.toLocaleString()} records`);
    console.log(`Estimated batches: ${Math.ceil((totalCount || 0) / BATCH_SIZE)}\n`);

    let batchNumber = 1;
    let totalUpdated = 0;

    while (true) {
      console.log(`Processing batch ${batchNumber}...`);

      // Get IDs of records that need updating
      const { data: recordsToUpdate, error: fetchError } = await supabase
        .from("opportunities")
        .select("id, name, funder_name, focus_area, compliance_notes")
        .is("search_vector", null)
        .limit(BATCH_SIZE);

      if (fetchError) {
        throw new Error(`Failed to fetch records: ${fetchError.message}`);
      }

      if (!recordsToUpdate || recordsToUpdate.length === 0) {
        console.log("✅ No more records to process\n");
        break;
      }

      // Update each record (trigger will handle search_vector calculation)
      // We just need to touch the record to fire the trigger
      const updatePromises = recordsToUpdate.map((record) =>
        supabase
          .from("opportunities")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", record.id)
      );

      const results = await Promise.all(updatePromises);

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error(`⚠️  ${errors.length} errors in batch ${batchNumber}`);
        errors.slice(0, 3).forEach((e) => console.error(`  - ${e.error?.message}`));
      }

      const successCount = results.length - errors.length;
      totalUpdated += successCount;

      console.log(`  Updated: ${successCount} records`);
      console.log(`  Progress: ${totalUpdated.toLocaleString()} / ${totalCount?.toLocaleString()} (${Math.round((totalUpdated / (totalCount || 1)) * 100)}%)\n`);

      batchNumber++;

      // Small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("=== BACKFILL COMPLETE ===\n");
    console.log(`✅ Successfully updated ${totalUpdated.toLocaleString()} records`);
    console.log(`📊 Processed ${batchNumber - 1} batches`);

    // Verify completion
    const { count: remainingCount } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .is("search_vector", null);

    if (remainingCount === 0) {
      console.log("✅ All records now have search vectors!\n");
    } else {
      console.log(`⚠️  ${remainingCount} records still need backfill\n`);
    }

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
