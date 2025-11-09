#!/usr/bin/env tsx
/**
 * Test script to verify multi-select focus area filtering works with OR logic
 */

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

async function testMultiSelectFilter() {
  console.log("Testing multi-select focus area filtering with OR logic\n");

  // Test 1: Single focus area
  console.log("=== Test 1: Single focus area (health) ===");
  const { data: healthOnly, error: error1 } = await supabase
    .from("opportunities")
    .select("id, name, focus_area")
    .eq("focus_area", "health")
    .limit(5);

  if (error1) {
    console.error("Error:", error1);
  } else {
    console.log(`Found ${healthOnly?.length || 0} health opportunities`);
    healthOnly?.forEach(opp => {
      console.log(`  - ${opp.name} (${opp.focus_area})`);
    });
  }

  // Test 2: Multiple focus areas with OR logic
  console.log("\n=== Test 2: Multiple focus areas (health OR education) ===");
  const { data: multipleAreas, error: error2 } = await supabase
    .from("opportunities")
    .select("id, name, focus_area")
    .or("focus_area.eq.health,focus_area.eq.education")
    .limit(10);

  if (error2) {
    console.error("Error:", error2);
  } else {
    console.log(`Found ${multipleAreas?.length || 0} opportunities matching health OR education`);
    multipleAreas?.forEach(opp => {
      console.log(`  - ${opp.name} (${opp.focus_area})`);
    });
  }

  // Test 3: Get counts for each focus area
  console.log("\n=== Test 3: Count by focus area ===");
  const focusAreas = ["health", "education", "arts-culture", "environment", "human-services"];

  for (const area of focusAreas) {
    const { count } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("focus_area", area);

    console.log(`  ${area}: ${count?.toLocaleString() || 0}`);
  }

  // Test 4: Combined health + education count vs individual counts
  console.log("\n=== Test 4: Verify OR logic adds counts ===");
  const { count: healthCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("focus_area", "health");

  const { count: educationCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("focus_area", "education");

  const { count: combinedCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .or("focus_area.eq.health,focus_area.eq.education");

  console.log(`  Health: ${healthCount?.toLocaleString() || 0}`);
  console.log(`  Education: ${educationCount?.toLocaleString() || 0}`);
  console.log(`  Combined (OR): ${combinedCount?.toLocaleString() || 0}`);
  console.log(`  Expected (sum): ${(healthCount || 0) + (educationCount || 0)}`);

  if (combinedCount === (healthCount || 0) + (educationCount || 0)) {
    console.log("  ✅ OR logic working correctly!");
  } else {
    console.log("  ❌ OR logic may have issues");
  }
}

testMultiSelectFilter().catch(console.error);
