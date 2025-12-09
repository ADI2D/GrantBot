#!/usr/bin/env tsx
// ============================================================================
// CHECK CLOSED GRANTS
// ============================================================================
// Query database for closed grant statistics
// ============================================================================

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local (if it exists)
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
  // .env.local not found - that's okay, will use environment variables
  console.log("Note: .env.local not found, using system environment variables");
}

async function main() {
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: Missing required environment variables:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓" : "✗");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗");
    console.error("\nPlease set these in your environment or create a .env.local file");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("=".repeat(80));
  console.log("CLOSED GRANTS ANALYSIS");
  console.log("=".repeat(80));
  console.log("");

  // Get total count of all opportunities
  const { count: totalCount, error: totalError } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    console.error("Error getting total count:", totalError);
    process.exit(1);
  }

  console.log(`📊 Total opportunities in database: ${totalCount}`);
  console.log("");

  // Get count by status
  const { data: statusData, error: statusError } = await supabase
    .from("opportunities")
    .select("status")
    .not("status", "is", null);

  if (statusError) {
    console.error("Error getting status breakdown:", statusError);
    process.exit(1);
  }

  const statusCounts = statusData.reduce((acc: Record<string, number>, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  console.log("📈 Status Breakdown:");
  Object.entries(statusCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  console.log("");

  // Get opportunities with status 'closed'
  const { data: closedData, count: closedCount, error: closedError } = await supabase
    .from("opportunities")
    .select("id, name, deadline, source, status", { count: "exact" })
    .eq("status", "closed")
    .order("deadline", { ascending: true });

  if (closedError) {
    console.error("Error getting closed grants:", closedError);
    process.exit(1);
  }

  console.log(`🔒 Closed opportunities (status='closed'): ${closedCount}`);

  if (closedData && closedData.length > 0) {
    const oldest = closedData[0];
    console.log(`   Oldest closed grant deadline: ${oldest.deadline}`);
    console.log(`   Name: ${oldest.name}`);
    console.log(`   Source: ${oldest.source}`);
  }
  console.log("");

  // Get opportunities with past deadlines (regardless of status)
  const today = new Date().toISOString().split("T")[0];
  const { data: pastDeadlineData, count: pastDeadlineCount, error: pastDeadlineError } = await supabase
    .from("opportunities")
    .select("id, name, deadline, source, status", { count: "exact" })
    .not("deadline", "is", null)
    .lt("deadline", today)
    .order("deadline", { ascending: true });

  if (pastDeadlineError) {
    console.error("Error getting past deadline grants:", pastDeadlineError);
    process.exit(1);
  }

  console.log(`⏰ Opportunities with past deadlines (deadline < today): ${pastDeadlineCount}`);

  if (pastDeadlineData && pastDeadlineData.length > 0) {
    const oldest = pastDeadlineData[0];
    console.log(`   Oldest deadline: ${oldest.deadline}`);
    console.log(`   Name: ${oldest.name}`);
    console.log(`   Source: ${oldest.source}`);
    console.log(`   Status: ${oldest.status}`);
    console.log("");

    // Show a few examples
    console.log("   Sample of oldest past-deadline grants:");
    pastDeadlineData.slice(0, 5).forEach((grant, i) => {
      console.log(`   ${i + 1}. ${grant.deadline} - ${grant.name.substring(0, 60)}... (${grant.status})`);
    });
  }
  console.log("");

  // Get breakdown by source
  const { data: sourceData, error: sourceError } = await supabase
    .from("opportunities")
    .select("source")
    .not("source", "is", null);

  if (sourceError) {
    console.error("Error getting source breakdown:", sourceError);
  } else {
    const sourceCounts = sourceData.reduce((acc: Record<string, number>, row) => {
      acc[row.source] = (acc[row.source] || 0) + 1;
      return acc;
    }, {});

    console.log("🔗 Source Breakdown:");
    Object.entries(sourceCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
  }

  console.log("");
  console.log("=".repeat(80));
}

main().catch(console.error);
