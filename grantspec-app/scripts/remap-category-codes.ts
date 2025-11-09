/**
 * Remap Grants.gov category codes to friendly category names
 *
 * Grants.gov uses abbreviation codes like:
 * - HL = Health
 * - ED = Education
 * - ENV = Environment
 * etc.
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

/**
 * Map Grants.gov category codes to our friendly categories
 * Based on: https://www.grants.gov/learn-grants/grant-making-agencies
 */
function mapCategoryCodeToFocusArea(codes: string | string[]): string {
  // Handle array of codes or JSON array string
  let codeArray: string[] = [];

  if (typeof codes === "string") {
    // Check if it's a JSON array string
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

  // Check each code and return the first matching category
  for (const code of codeArray) {
    const upperCode = code.toUpperCase();

    // Health & Wellness
    if (["HL", "FN"].includes(upperCode)) {
      return "Health & Wellness";
    }

    // Education
    if (["ED", "ELT"].includes(upperCode)) {
      return "Education";
    }

    // Environment
    if (["ENV", "EN", "AG"].includes(upperCode)) {
      return "Environment";
    }

    // Research & Innovation
    if (["NR", "ST", "IS"].includes(upperCode)) {
      return "Research & Innovation";
    }

    // Arts & Culture
    if (["AR", "HU"].includes(upperCode)) {
      return "Arts & Culture";
    }

    // Community Development
    if (["CD", "HO", "RD"].includes(upperCode)) {
      return "Community Development";
    }

    // Disaster Relief
    if (["DPR"].includes(upperCode)) {
      return "Disaster Relief";
    }

    // Law & Justice
    if (["LJL", "ISS"].includes(upperCode)) {
      return "Other"; // We'll categorize law/justice as Other for now
    }
  }

  return "Other";
}

async function remapCategoryCodes() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\n=== REMAPPING CATEGORY CODES ===\n");

  // Fetch all opportunities
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("id, name, focus_area");

  if (error) {
    console.error("Error fetching opportunities:", error);
    return;
  }

  console.log(`Found ${opportunities?.length || 0} total opportunities\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const mappingChanges: Record<string, number> = {};

  for (const opp of opportunities || []) {
    if (!opp.focus_area) {
      skipped++;
      continue;
    }

    const newCategory = mapCategoryCodeToFocusArea(opp.focus_area);

    // Only update if it's different
    if (newCategory !== opp.focus_area) {
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({ focus_area: newCategory })
        .eq("id", opp.id);

      if (updateError) {
        console.error(`Error updating ${opp.id}:`, updateError);
        errors++;
      } else {
        const change = `${opp.focus_area} → ${newCategory}`;
        mappingChanges[change] = (mappingChanges[change] || 0) + 1;
        updated++;

        if (updated <= 10) {
          console.log(`✓ "${opp.name.substring(0, 60)}..."`);
          console.log(`  ${opp.focus_area} → ${newCategory}\n`);
        } else if (updated === 11) {
          console.log("... (showing first 10 updates only)\n");
        }
      }
    } else {
      skipped++;
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  console.log("\n=== MAPPING CHANGES (Top 20) ===");
  Object.entries(mappingChanges)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([change, count]) => {
      console.log(`${change.padEnd(50)} : ${count}`);
    });

  // Show final distribution
  const { data: finalOpps } = await supabase
    .from("opportunities")
    .select("focus_area");

  const distribution: Record<string, number> = {};
  finalOpps?.forEach((opp) => {
    const category = opp.focus_area || "NULL";
    distribution[category] = (distribution[category] || 0) + 1;
  });

  console.log("\n=== FINAL DISTRIBUTION ===");
  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`${category.padEnd(30)} : ${count}`);
    });
}

remapCategoryCodes().catch(console.error);
