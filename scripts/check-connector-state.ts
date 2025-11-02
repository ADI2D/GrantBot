#!/usr/bin/env tsx

/**
 * Check Connector State
 * Queries the connector_sync_state and sync_logs tables to diagnose sync history issues
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
  console.error("❌ Missing Supabase credentials");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== CHECKING CONNECTOR STATE ===\n");

  // Check connector_sync_state table
  console.log("1. Checking connector_sync_state table...");
  const { data: connectors, error: connectorError } = await supabase
    .from("connector_sync_state")
    .select("*");

  if (connectorError) {
    console.error("❌ Error querying connector_sync_state:", connectorError.message);
  } else if (!connectors || connectors.length === 0) {
    console.log("⚠️  No records found in connector_sync_state table");
    console.log("\nThis means the connector hasn't been initialized yet.");
    console.log("See: docs/INITIALIZE_CONNECTOR.md for setup instructions\n");
  } else {
    console.log(`✅ Found ${connectors.length} connector(s):\n`);
    connectors.forEach((c) => {
      console.log(`  Source: ${c.source}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  Last Sync Started: ${c.last_sync_started_at || "Never"}`);
      console.log(`  Last Sync Completed: ${c.last_sync_completed_at || "Never"}`);
      console.log(`  Last Successful Sync: ${c.last_successful_sync_at || "Never"}`);
      console.log(`  Records Fetched: ${c.records_fetched}`);
      console.log(`  Records Created: ${c.records_created}`);
      console.log(`  Records Updated: ${c.records_updated}`);
      console.log(`  Records Skipped: ${c.records_skipped}`);
      if (c.errors) {
        console.log(`  Errors: ${JSON.stringify(c.errors)}`);
      }
      console.log();
    });
  }

  // Check sync_logs table
  console.log("2. Checking sync_logs table...");
  const { data: logs, error: logsError, count } = await supabase
    .from("sync_logs")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .limit(10);

  if (logsError) {
    console.error("❌ Error querying sync_logs:", logsError.message);
  } else if (!logs || logs.length === 0) {
    console.log("⚠️  No records found in sync_logs table");
    console.log("\nThis means no syncs have been run yet.");
    console.log("To run your first sync:");
    console.log("  npm run sync:grants\n");
  } else {
    console.log(`✅ Found ${count} sync log(s) (showing last 10):\n`);
    logs.forEach((log) => {
      console.log(`  ID: ${log.id}`);
      console.log(`  Source: ${log.source}`);
      console.log(`  Started: ${log.started_at}`);
      console.log(`  Completed: ${log.completed_at || "Not completed"}`);
      console.log(`  Status: ${log.status}`);
      console.log(`  Records Processed: ${log.records_processed}`);
      console.log(`  Created: ${log.records_created}, Updated: ${log.records_updated}, Skipped: ${log.records_skipped}`);
      if (log.errors) {
        console.log(`  Errors: ${JSON.stringify(log.errors)}`);
      }
      console.log();
    });
  }

  console.log("=== DIAGNOSIS COMPLETE ===\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
