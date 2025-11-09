#!/usr/bin/env tsx
/**
 * Check how many opportunities would be visible without the 1000 limit
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

async function checkVisibleCount() {
  // Simulate the same query as data-service.ts
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

  console.log(`Checking opportunities visible with current filters (60+ days ago: ${sixtyDaysAgoStr})\n`);

  // Count opportunities that match the filter (deadline >= 60 days ago OR null, status != closed)
  const { count: visibleCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .neq("status", "closed")
    .or(`deadline.gte.${sixtyDaysAgoStr},deadline.is.null`);

  console.log(`Total opportunities in DB: 83,198`);
  console.log(`Visible opportunities (after filters): ${visibleCount?.toLocaleString() || 0}`);
  console.log(`Current hard limit: 1,000`);
  console.log(`\nIs limit being hit? ${(visibleCount || 0) > 1000 ? "YES ⚠️" : "NO ✅"}`);

  if ((visibleCount || 0) > 1000) {
    console.log(`\nYou're missing ${((visibleCount || 0) - 1000).toLocaleString()} opportunities due to the limit.`);
  }

  // Show breakdown by focus area
  console.log("\n=== Breakdown by focus area (without limit) ===");
  const focusAreas = [
    "health",
    "education",
    "arts-culture",
    "environment",
    "human-services",
    "youth-development",
    "community-development",
    "research-science",
    "international",
    "other"
  ];

  for (const area of focusAreas) {
    const { count } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("focus_area", area)
      .neq("status", "closed")
      .or(`deadline.gte.${sixtyDaysAgoStr},deadline.is.null`);

    console.log(`  ${area.padEnd(25)}: ${count?.toLocaleString() || 0}`);
  }
}

checkVisibleCount().catch(console.error);
