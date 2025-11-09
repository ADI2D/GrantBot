#!/usr/bin/env tsx

/**
 * Reset Connector Status
 * Resets a connector stuck in 'running' status back to 'idle'
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
  console.log("=== RESETTING CONNECTOR STATUS ===\n");

  // Find connectors stuck in 'running' status
  const { data: stuckConnectors, error: fetchError } = await supabase
    .from("connector_sync_state")
    .select("*")
    .eq("status", "running");

  if (fetchError) {
    console.error("❌ Error querying connector_sync_state:", fetchError.message);
    process.exit(1);
  }

  if (!stuckConnectors || stuckConnectors.length === 0) {
    console.log("✅ No connectors stuck in 'running' status");
    process.exit(0);
  }

  console.log(`Found ${stuckConnectors.length} connector(s) stuck in 'running' status:\n`);
  stuckConnectors.forEach((c) => {
    console.log(`  - ${c.source} (started: ${c.last_sync_started_at})`);
  });

  console.log("\nResetting to 'idle' status...\n");

  // Reset each connector to 'idle'
  for (const connector of stuckConnectors) {
    const { error: updateError } = await supabase
      .from("connector_sync_state")
      .update({ status: "idle" })
      .eq("source", connector.source);

    if (updateError) {
      console.error(`❌ Error resetting ${connector.source}:`, updateError.message);
    } else {
      console.log(`✅ Reset ${connector.source} to 'idle'`);
    }
  }

  console.log("\n=== RESET COMPLETE ===\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
