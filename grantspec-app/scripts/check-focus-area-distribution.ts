/**
 * Check the current distribution of focus areas in the database
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
  process.exit(1);
}

async function checkDistribution() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\n=== FOCUS AREA DISTRIBUTION ===\n");

  // Get total count first
  const { count: totalCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  console.log(`Total opportunities: ${totalCount}\n`);

  // Fetch ALL opportunities in batches to count categories
  const distribution: Record<string, number> = {};
  const batchSize = 1000;
  let offset = 0;

  while (offset < (totalCount || 0)) {
    const { data: batch, error } = await supabase
      .from("opportunities")
      .select("focus_area")
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Error fetching batch:", error);
      break;
    }

    batch?.forEach((opp) => {
      const category = opp.focus_area || "NULL";
      distribution[category] = (distribution[category] || 0) + 1;
    });

    offset += batchSize;
  }

  // Separate friendly names from codes
  const friendlyNames: Record<string, number> = {};
  const codes: Record<string, number> = {};

  Object.entries(distribution).forEach(([category, count]) => {
    // Friendly names have spaces or are known categories
    if (
      category.includes(" ") ||
      ["Education", "Environment", "Other"].includes(category)
    ) {
      friendlyNames[category] = count;
    } else {
      codes[category] = count;
    }
  });

  // Show friendly names
  console.log("✅ FRIENDLY NAMES (Remapped):");
  const friendlyTotal = Object.values(friendlyNames).reduce((a, b) => a + b, 0);
  Object.entries(friendlyNames)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / (totalCount || 1)) * 100).toFixed(1);
      console.log(`  ${category.padEnd(30)} : ${count.toString().padStart(6)} (${percentage}%)`);
    });
  console.log(`  ${"TOTAL".padEnd(30)} : ${friendlyTotal.toString().padStart(6)}\n`);

  // Show codes (not yet remapped)
  if (Object.keys(codes).length > 0) {
    console.log("⚠️  CODES (Still need remapping):");
    const codesTotal = Object.values(codes).reduce((a, b) => a + b, 0);
    Object.entries(codes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([category, count]) => {
        const percentage = ((count / (totalCount || 1)) * 100).toFixed(1);
        console.log(`  ${category.padEnd(30)} : ${count.toString().padStart(6)} (${percentage}%)`);
      });
    if (Object.keys(codes).length > 20) {
      console.log(`  ... and ${Object.keys(codes).length - 20} more codes`);
    }
    console.log(`  ${"TOTAL".padEnd(30)} : ${codesTotal.toString().padStart(6)}\n`);

    const remappedPercent = ((friendlyTotal / (totalCount || 1)) * 100).toFixed(1);
    console.log(`📊 Progress: ${remappedPercent}% remapped (${friendlyTotal} of ${totalCount})`);

    if (codesTotal > 0) {
      console.log("\n💡 To finish remapping, run:");
      console.log("   npx tsx scripts/remap-all-categories.ts\n");
    }
  } else {
    console.log("✅ All opportunities have been remapped to friendly names!\n");
  }
}

checkDistribution().catch(console.error);
