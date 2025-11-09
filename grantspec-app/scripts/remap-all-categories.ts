/**
 * Remap ALL Grants.gov category codes to friendly category names (batch processing)
 * Processes in batches of 1000 to handle large datasets
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

function mapCategoryCodeToFocusArea(codes: string | string[]): string {
  let codeArray: string[] = [];

  if (typeof codes === "string") {
    if (codes.startsWith("[") && codes.endsWith("]")) {
      try {
        codeArray = JSON.parse(codes);
      } catch {
        codeArray = [codes];
      }
    } else {
      codeArray = [codes];
    }
  } else if (Array.isArray(codes)) {
    codeArray = codes;
  }

  for (const code of codeArray) {
    const upperCode = code.toUpperCase();

    if (["HL", "FN"].includes(upperCode)) return "Health & Wellness";
    if (["ED", "ELT"].includes(upperCode)) return "Education";
    if (["ENV", "EN", "AG"].includes(upperCode)) return "Environment";
    if (["NR", "ST", "IS"].includes(upperCode)) return "Research & Innovation";
    if (["AR", "HU"].includes(upperCode)) return "Arts & Culture";
    if (["CD", "HO", "RD"].includes(upperCode)) return "Community Development";
    if (["DPR"].includes(upperCode)) return "Disaster Relief";
    if (["LJL", "ISS"].includes(upperCode)) return "Other";
  }

  return "Other";
}

async function remapAllCategories() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\n=== REMAPPING ALL CATEGORY CODES (BATCH PROCESSING) ===\n");

  // First, get total count
  const { count: totalCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  console.log(`Total opportunities in database: ${totalCount}\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const batchSize = 1000;
  let offset = 0;

  while (offset < (totalCount || 0)) {
    console.log(`Processing batch ${Math.floor(offset / batchSize) + 1} (records ${offset + 1}-${Math.min(offset + batchSize, totalCount || 0)})...`);

    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("id, name, focus_area")
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Error fetching batch:", error);
      totalErrors++;
      offset += batchSize;
      continue;
    }

    let batchUpdated = 0;
    let batchSkipped = 0;

    for (const opp of opportunities || []) {
      if (!opp.focus_area) {
        batchSkipped++;
        continue;
      }

      const newCategory = mapCategoryCodeToFocusArea(opp.focus_area);

      if (newCategory !== opp.focus_area) {
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ focus_area: newCategory })
          .eq("id", opp.id);

        if (updateError) {
          totalErrors++;
        } else {
          batchUpdated++;
        }
      } else {
        batchSkipped++;
      }
    }

    totalUpdated += batchUpdated;
    totalSkipped += batchSkipped;

    console.log(`  Updated: ${batchUpdated}, Skipped: ${batchSkipped}\n`);

    offset += batchSize;
  }

  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total Updated: ${totalUpdated}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Total Errors: ${totalErrors}`);

  // Show final distribution
  console.log("\n=== FINAL DISTRIBUTION ===");
  const { data: finalOpps } = await supabase
    .from("opportunities")
    .select("focus_area");

  const distribution: Record<string, number> = {};
  finalOpps?.forEach((opp) => {
    const category = opp.focus_area || "NULL";
    distribution[category] = (distribution[category] || 0) + 1;
  });

  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`${category.padEnd(30)} : ${count}`);
    });
}

remapAllCategories().catch(console.error);
