#!/usr/bin/env tsx
/**
 * Test that opportunities are sorted by deadline (soonest first, NULL last)
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

async function testDeadlineSort() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

  console.log("Testing deadline sort (ascending with NULLS LAST)\n");

  const { data, error } = await supabase
    .from("opportunities")
    .select("name, deadline, focus_area")
    .neq("status", "closed")
    .or(`deadline.gte.${sixtyDaysAgoStr},deadline.is.null`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(20);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("First 20 opportunities (should show soonest deadlines first):\n");

  const now = new Date();
  data?.forEach((opp, index) => {
    const deadlineStr = opp.deadline || "No deadline (ongoing)";
    const daysUntil = opp.deadline
      ? Math.ceil((new Date(opp.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const urgency = daysUntil !== null
      ? daysUntil < 0
        ? `${Math.abs(daysUntil)} days ago ⚠️`
        : `${daysUntil} days from now`
      : "Ongoing program";

    console.log(`${(index + 1).toString().padStart(2)}. ${deadlineStr.padEnd(30)} (${urgency})`);
    console.log(`    ${opp.name.substring(0, 70)}...`);
    console.log(`    Focus: ${opp.focus_area}\n`);
  });

  // Show last 20 (should be NULL deadlines or far future)
  console.log("\n=== Last 20 opportunities (should show NULL deadlines) ===\n");

  const { data: lastData } = await supabase
    .from("opportunities")
    .select("name, deadline, focus_area")
    .neq("status", "closed")
    .or(`deadline.gte.${sixtyDaysAgoStr},deadline.is.null`)
    .order("deadline", { ascending: false, nullsFirst: true })
    .limit(20);

  lastData?.forEach((opp, index) => {
    const deadlineStr = opp.deadline || "No deadline (ongoing)";
    console.log(`${(index + 1).toString().padStart(2)}. ${deadlineStr}`);
    console.log(`    ${opp.name.substring(0, 70)}...`);
    console.log(`    Focus: ${opp.focus_area}\n`);
  });
}

testDeadlineSort().catch(console.error);
