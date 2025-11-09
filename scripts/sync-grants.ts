#!/usr/bin/env tsx
// ============================================================================
// GRANT SYNC CLI SCRIPT
// ============================================================================
// Manually trigger grant opportunity sync for testing
//
// Usage:
//   npm run sync:grants              # Sync all connectors (incremental)
//   npm run sync:grants -- --full    # Full refresh (ignore last sync time)
//   npm run sync:grants -- --dry-run # Preview what would be synced
//   npm run sync:grants -- --source grants_gov  # Sync specific connector
// ============================================================================

import { readFileSync } from "fs";
import { resolve } from "path";
import { GrantsGovConnector } from "../src/lib/connectors/grants-gov-connector";
import { USASpendingConnector } from "../src/lib/connectors/usaspending-connector";
import { GrantIngestionPipeline } from "../src/lib/ingestion/pipeline";
import type { GrantConnector } from "../src/types/connectors";

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

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  full: args.includes("--full"),
  dryRun: args.includes("--dry-run"),
  source: args.find((arg) => arg.startsWith("--source="))?.split("=")[1],
};

async function main() {
  console.log("=".repeat(80));
  console.log("GRANTBOT - OPPORTUNITY SYNC");
  console.log("=".repeat(80));
  console.log(`Mode: ${options.dryRun ? "DRY RUN" : options.full ? "FULL REFRESH" : "INCREMENTAL"}`);
  console.log(`Source: ${options.source || "ALL"}`);
  console.log("=".repeat(80));
  console.log("");

  // Initialize connectors
  const connectors: GrantConnector[] = [];

  // Add Grants.gov connector
  if (!options.source || options.source === "grants_gov") {
    connectors.push(new GrantsGovConnector());
  }

  // Add USAspending.gov connector
  if (!options.source || options.source === "usaspending") {
    connectors.push(new USASpendingConnector());
  }

  if (connectors.length === 0) {
    console.error(`❌ No connector found for source: ${options.source}`);
    process.exit(1);
  }

  // Run pipeline
  const pipeline = new GrantIngestionPipeline();

  try {
    const results = await pipeline.runAll(connectors, {
      incremental: !options.full,
      dryRun: options.dryRun,
    });

    // Print results
    console.log("");
    console.log("=".repeat(80));
    console.log("SYNC RESULTS");
    console.log("=".repeat(80));

    for (const result of results) {
      const statusIcon = result.status === "success" ? "✅" : result.status === "partial" ? "⚠️" : "❌";
      console.log(`${statusIcon} ${result.source}`);
      console.log(`   Status: ${result.status.toUpperCase()}`);
      console.log(`   Duration: ${(result.duration_ms / 1000).toFixed(2)}s`);
      console.log(`   Fetched: ${result.records_fetched}`);
      console.log(`   Created: ${result.records_created}`);
      console.log(`   Updated: ${result.records_updated}`);
      console.log(`   Skipped: ${result.records_skipped}`);
      console.log(`   Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log("   Error details:");
        result.errors.slice(0, 3).forEach((err, i) => {
          console.log(`     ${i + 1}. ${err.message}`);
        });
        if (result.errors.length > 3) {
          console.log(`     ... and ${result.errors.length - 3} more`);
        }
      }
      console.log("");
    }

    console.log("=".repeat(80));

    // Exit with error if any connector failed completely
    const hasFailures = results.some((r) => r.status === "failed");
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error("");
    console.error("=".repeat(80));
    console.error("❌ FATAL ERROR");
    console.error("=".repeat(80));
    console.error(error);
    console.error("=".repeat(80));
    process.exit(1);
  }
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

// Run
main();
