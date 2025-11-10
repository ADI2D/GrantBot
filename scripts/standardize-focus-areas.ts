#!/usr/bin/env tsx
/**
 * Standardize all focus_area values to use display labels consistently
 * This fixes mixed casing and ID/label mismatches
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

async function standardizeFocusAreas() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\n=== STANDARDIZING FOCUS AREA VALUES ===\n");

  // Define mappings from various formats to standard display labels
  const mappings = [
    {
      label: "Education",
      variants: ["education"],
    },
    {
      label: "Health & Wellness",
      variants: ["health", "Health", "health-wellness"],
    },
    {
      label: "Environment & Animals",
      variants: ["environment", "Environment"],
    },
    {
      label: "Research & Innovation",
      variants: ["research-science", "Research", "Science"],
    },
    {
      label: "Community Development",
      variants: ["community-development", "Community"],
    },
    {
      label: "Arts & Culture",
      variants: ["arts-culture", "Arts"],
    },
  ];

  let totalUpdated = 0;

  for (const mapping of mappings) {
    console.log(`Standardizing "${mapping.label}"...`);

    for (const variant of mapping.variants) {
      const { count, error } = await supabase
        .from("opportunities")
        .update({ focus_area: mapping.label })
        .eq("focus_area", variant)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error(`  Error updating "${variant}":`, error);
      } else if (count && count > 0) {
        console.log(`  ✓ Updated ${count} opportunities from "${variant}" to "${mapping.label}"`);
        totalUpdated += count;
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total updated: ${totalUpdated}`);

  // Show final distribution
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("focus_area");

  const distribution: Record<string, number> = {};
  opportunities?.forEach((opp) => {
    const category = opp.focus_area || "NULL";
    distribution[category] = (distribution[category] || 0) + 1;
  });

  console.log("\n=== FINAL DISTRIBUTION ===");
  Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`${category.padEnd(30)} : ${count}`);
    });

  console.log("\n✓ Standardization complete!");
  console.log("\nNext step: Run 'npm run recategorize' to recategorize remaining 'Other' opportunities");
}

standardizeFocusAreas().catch(console.error);
