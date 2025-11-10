/**
 * Recategorize all opportunities based on their names and compliance notes
 * This will update focus_area for all opportunities that don't have one or have "Other"
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

function mapTitleToFocusArea(text: string): string {
  const lowerText = text.toLowerCase();

  // Map based on keywords in title/description
  // Health & Wellness - check first because it has many specific terms
  if (
    lowerText.includes("health") ||
    lowerText.includes("medical") ||
    lowerText.includes("wellness") ||
    lowerText.includes("substance use") ||
    lowerText.includes("substance abuse") ||
    lowerText.includes("treatment") ||
    lowerText.includes("prevention") ||
    lowerText.includes("mental health") ||
    lowerText.includes("behavioral health") ||
    lowerText.includes("clinical") ||
    lowerText.includes("disease") ||
    lowerText.includes("patient") ||
    lowerText.includes("hospital") ||
    lowerText.includes("nursing") ||
    lowerText.includes("pharmaceutical") ||
    lowerText.includes("public health") ||
    lowerText.includes("epidemi") ||
    lowerText.includes("medicine")
  ) {
    return "Health & Wellness";
  }

  // Education
  if (
    lowerText.includes("education") ||
    lowerText.includes("school") ||
    lowerText.includes("student") ||
    lowerText.includes("teacher") ||
    lowerText.includes("learning") ||
    lowerText.includes("academic") ||
    lowerText.includes("university") ||
    lowerText.includes("college") ||
    lowerText.includes("curriculum") ||
    lowerText.includes("literacy") ||
    lowerText.includes("stem") ||
    lowerText.includes("training program")
  ) {
    return "Education";
  }

  // Research & Science - check before Community Development to catch research keywords
  if (
    lowerText.includes("research") ||
    lowerText.includes("science") ||
    lowerText.includes("innovation") ||
    lowerText.includes("laboratory") ||
    lowerText.includes("investigation") ||
    lowerText.includes("study") ||
    lowerText.includes("experiment") ||
    lowerText.includes("implementation science") ||
    lowerText.includes("biomedical") ||
    lowerText.includes("scientific")
  ) {
    return "Research & Innovation";
  }

  // Community Development
  if (
    lowerText.includes("community") ||
    lowerText.includes("housing") ||
    lowerText.includes("development") ||
    lowerText.includes("neighborhood") ||
    lowerText.includes("infrastructure") ||
    lowerText.includes("economic development") ||
    lowerText.includes("workforce")
  ) {
    return "Community Development";
  }

  // Environment
  if (
    lowerText.includes("environment") ||
    lowerText.includes("energy") ||
    lowerText.includes("climate") ||
    lowerText.includes("conservation") ||
    lowerText.includes("sustainability") ||
    lowerText.includes("renewable") ||
    lowerText.includes("pollution") ||
    lowerText.includes("ecosystem")
  ) {
    return "Environment";
  }

  // Arts & Culture
  if (
    lowerText.includes("arts") ||
    lowerText.includes("culture") ||
    lowerText.includes("humanities") ||
    lowerText.includes("museum") ||
    lowerText.includes("music") ||
    lowerText.includes("theater") ||
    lowerText.includes("film") ||
    lowerText.includes("heritage")
  ) {
    return "Arts & Culture";
  }

  // Disaster Relief
  if (
    lowerText.includes("disaster") ||
    lowerText.includes("emergency") ||
    lowerText.includes("relief") ||
    lowerText.includes("humanitarian") ||
    lowerText.includes("crisis")
  ) {
    return "Disaster Relief";
  }

  return "Other";
}

async function recategorizeOpportunities() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\n=== RECATEGORIZING OPPORTUNITIES ===\n");

  // Fetch all opportunities
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("id, name, focus_area, compliance_notes, funder_name");

  if (error) {
    console.error("Error fetching opportunities:", error);
    return;
  }

  console.log(`Found ${opportunities?.length || 0} total opportunities\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const categoryChanges: Record<string, number> = {};

  for (const opp of opportunities || []) {
    const text = `${opp.name} ${opp.compliance_notes || ""} ${opp.funder_name || ""}`;
    const newFocusArea = mapTitleToFocusArea(text);

    // Update if focus_area is null, empty, or "Other" and we found a better category
    const shouldUpdate = !opp.focus_area || opp.focus_area === "Other" || opp.focus_area === "";

    if (shouldUpdate && newFocusArea !== "Other") {
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({ focus_area: newFocusArea })
        .eq("id", opp.id);

      if (updateError) {
        console.error(`Error updating ${opp.id}:`, updateError);
        errors++;
      } else {
        const change = `${opp.focus_area || "NULL"} → ${newFocusArea}`;
        categoryChanges[change] = (categoryChanges[change] || 0) + 1;
        updated++;

        if (updated <= 5) {
          console.log(`✓ Updated: "${opp.name}"`);
          console.log(`  ${opp.focus_area || "NULL"} → ${newFocusArea}\n`);
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

  console.log("\n=== CATEGORY CHANGES ===");
  Object.entries(categoryChanges)
    .sort((a, b) => b[1] - a[1])
    .forEach(([change, count]) => {
      console.log(`${change.padEnd(40)} : ${count}`);
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

recategorizeOpportunities().catch(console.error);
