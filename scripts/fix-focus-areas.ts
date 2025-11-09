#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  const value = valueParts.join("=").replace(/^["']|["']$/g, "");
  if (key && value) process.env[key] = value;
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Mapping from old format to new format
const FOCUS_AREA_MAPPING: Record<string, string> = {
  "Health & Wellness": "health",
  "Health": "health",
  "health": "health",
  
  "Arts & Culture": "arts-culture",
  "Arts": "arts-culture",
  "Culture": "arts-culture",
  "arts-culture": "arts-culture",
  
  "Education": "education",
  "education": "education",
  
  "Environment": "environment",
  "Environment & Animals": "environment",
  "environment": "environment",
  
  "Human Services": "human-services",
  "human-services": "human-services",
  
  "Youth Development": "youth-development",
  "youth-development": "youth-development",
  
  "Community Development": "community-development",
  "community-development": "community-development",
  
  "Research & Innovation": "research-science",
  "Research & Science": "research-science",
  "Research": "research-science",
  "Science": "research-science",
  "research-science": "research-science",
  
  "International": "international",
  "international": "international",
  
  "Other": "other",
  "other": "other",
  
  // Handle some strange values found in the data
  "BC": "other",
  "ST": "other",
};

async function main() {
  console.log("=".repeat(80));
  console.log("FIX FOCUS AREA DATA FORMAT");
  console.log("=".repeat(80));
  console.log();

  // Get all unique focus_area values
  const { data: allOpps } = await supabase
    .from("opportunities")
    .select("focus_area");

  if (!allOpps) {
    console.log("No opportunities found");
    return;
  }

  const uniqueValues = new Set(allOpps.map((o) => o.focus_area));
  console.log("Current unique focus_area values:");
  Array.from(uniqueValues).sort().forEach((val) => {
    const mapped = FOCUS_AREA_MAPPING[val] || "UNMAPPED";
    console.log(`  "${val}" -> "${mapped}"`);
  });

  console.log();
  console.log("Starting migration...");
  console.log();

  let updated = 0;
  let skipped = 0;

  for (const [oldValue, newValue] of Object.entries(FOCUS_AREA_MAPPING)) {
    // Update opportunities with this old value
    const { count, error } = await supabase
      .from("opportunities")
      .update({
        focus_area: newValue,
        focus_areas: [newValue],
      })
      .eq("focus_area", oldValue);

    if (error) {
      console.error(`Error updating "${oldValue}":`, error.message);
      continue;
    }

    if (count && count > 0) {
      console.log(`✓ Updated ${count.toLocaleString()} records: "${oldValue}" -> "${newValue}"`);
      updated += count;
    } else {
      skipped++;
    }
  }

  console.log();
  console.log("=".repeat(80));
  console.log(`MIGRATION COMPLETE`);
  console.log(`  Updated: ${updated.toLocaleString()} records`);
  console.log(`  Skipped: ${skipped} mappings (no records found)`);
  console.log("=".repeat(80));

  // Verify the results
  console.log();
  console.log("Verifying results...");
  const { data: afterOpps } = await supabase.from("opportunities").select("focus_area");

  if (afterOpps) {
    const afterUnique = new Set(afterOpps.map((o) => o.focus_area));
    console.log();
    console.log("New unique focus_area values:");
    Array.from(afterUnique).sort().forEach((val) => console.log(`  - ${val}`));
  }
}

main();
