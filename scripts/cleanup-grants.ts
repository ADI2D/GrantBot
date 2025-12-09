#!/usr/bin/env tsx
// ============================================================================
// GRANT CLEANUP CLI SCRIPT
// ============================================================================
// Manually run grant cleanup operations
//
// Usage:
//   npm run cleanup:grants              # Run full cleanup
//   npm run cleanup:grants -- --dry-run # Preview what would be cleaned up
//   npm run cleanup:grants -- --stats   # Show stats only
// ============================================================================

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { GrantCleanup } from "../src/lib/ingestion/cleanup";

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

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes("--dry-run"),
  statsOnly: args.includes("--stats"),
};

async function main() {
  console.log("=".repeat(80));
  console.log("GRANTBOT - GRANT CLEANUP");
  console.log("=".repeat(80));
  console.log(`Mode: ${options.statsOnly ? "STATS ONLY" : options.dryRun ? "DRY RUN" : "LIVE RUN"}`);
  console.log("=".repeat(80));
  console.log("");

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: Missing required environment variables:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓" : "✗");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓" : "✗");
    console.error("\nPlease set these in your environment or create a .env.local file");
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cleanup = new GrantCleanup(supabase);

  try {
    // Get current stats
    console.log("📊 Current Statistics:");
    const stats = await cleanup.getCleanupStats();
    console.log(`   Total grants: ${stats.total_grants}`);
    console.log(`   Open grants: ${stats.open_grants}`);
    console.log(`   Closed grants: ${stats.closed_grants}`);
    console.log("");
    console.log("🔍 Cleanup Candidates:");
    console.log(`   Expired grants still marked as open: ${stats.expired_open_grants}`);
    console.log(`   Closed grants older than 24 months: ${stats.old_closed_grants}`);
    console.log("");

    // If stats-only mode, exit here
    if (options.statsOnly) {
      console.log("=".repeat(80));
      console.log("Stats-only mode - no changes made");
      console.log("=".repeat(80));
      process.exit(0);
    }

    // If dry-run mode, preview what would be done
    if (options.dryRun) {
      console.log("=".repeat(80));
      console.log("DRY RUN - No changes will be made");
      console.log("=".repeat(80));
      console.log("");
      console.log("Would close:", stats.expired_open_grants, "expired grants");
      console.log("Would delete:", stats.old_closed_grants, "old closed grants");
      console.log("");
      console.log("=".repeat(80));
      process.exit(0);
    }

    // Run actual cleanup
    console.log("=".repeat(80));
    console.log("RUNNING CLEANUP");
    console.log("=".repeat(80));
    console.log("");

    const result = await cleanup.runCleanup();

    console.log("");
    console.log("=".repeat(80));
    console.log("CLEANUP RESULTS");
    console.log("=".repeat(80));
    console.log(`✅ Grants closed: ${result.grants_closed}`);
    console.log(`🗑️  Grants deleted: ${result.grants_deleted}`);
    console.log(`❌ Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("");
      console.log("Error details:");
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message}`);
      });
    }

    console.log("");
    console.log("📊 Updated Statistics:");
    const statsAfter = await cleanup.getCleanupStats();
    console.log(`   Total grants: ${statsAfter.total_grants}`);
    console.log(`   Open grants: ${statsAfter.open_grants}`);
    console.log(`   Closed grants: ${statsAfter.closed_grants}`);
    console.log("");
    console.log("=".repeat(80));

    // Exit with error if cleanup had errors
    process.exit(result.errors.length > 0 ? 1 : 0);
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
