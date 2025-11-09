#!/usr/bin/env tsx
/**
 * Regenerate APPLY_MIGRATIONS.sql from individual migration files
 * This ensures the combined script matches the latest migrations
 */

import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase/migrations");
const OUTPUT_FILE = path.join(process.cwd(), "supabase/APPLY_MIGRATIONS.sql");

// List of migrations to include (excluding old pricing_plans migration)
const migrations = [
  "20241024_initial.sql",
  "20241025_activity_logs.sql",
  "20241025_add_document_metadata.sql",
  "20241025_plan_and_usage.sql",
  "20241026_billing_payments.sql",
  "20241026_org_members_read.sql",
  "20241027_admin_tables.sql",
  "20241027_ai_costs.sql",
  "20241027_feature_flags.sql",
  "20241027_support_tables.sql",
  "20241031_fix_org_update_policy.sql",
  "20241031_storage_setup.sql",
  "20241101_add_connector_fields.sql",
  "20241101_add_proposal_archive.sql",
  "20241101_add_share_expiration.sql",
  "20241101_add_share_token.sql",
  "20241101_connector_sync_state.sql",
  "20241101_fix_grants_gov_urls.sql",
  "20241101_fix_opportunities_rls.sql",
  "20241101_pricing_plans.sql", // NEW pricing schema
  "20241101_proposal_comments.sql",
  "20241101_soft_delete_proposals.sql",
  "20241101_sync_logs.sql",
];

async function regenerateMigrations() {
  const now = new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";

  let output = `-- ============================================================================
-- GRANTBOT COMPLETE SCHEMA - Apply All Migrations
-- ============================================================================
-- Run this file in Supabase SQL Editor to create all tables and policies
-- Instructions:
--   1. Open your Supabase project SQL Editor
--   2. Copy and paste this entire file
--   3. Click "Run"
-- ============================================================================
--
-- NOTE: This file is auto-generated from individual migration files.
-- To regenerate: npx tsx scripts/regenerate-apply-migrations.ts
-- Last generated: ${now}
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

`;

  let counter = 1;

  for (const migration of migrations) {
    const migrationPath = path.join(MIGRATIONS_DIR, migration);

    if (!fs.existsSync(migrationPath)) {
      console.warn(`⚠️  Warning: Migration file not found: ${migration}`);
      continue;
    }

    // Extract migration name for section header
    const migrationName = migration
      .replace(/^\d{8}_/, "")
      .replace(/\.sql$/, "")
      .replace(/_/g, " ")
      .toUpperCase();

    output += `
-- ============================================================================
-- ${counter}. ${migrationName} (${migration})
-- ============================================================================

`;

    // Append migration content
    const content = fs.readFileSync(migrationPath, "utf-8");
    output += content;

    counter++;
  }

  output += `

-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
`;

  fs.writeFileSync(OUTPUT_FILE, output);

  console.log(`✅ Successfully regenerated ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log(`📊 Included ${counter - 1} migrations`);
}

regenerateMigrations().catch((error) => {
  console.error("❌ Error regenerating migrations:", error);
  process.exit(1);
});
