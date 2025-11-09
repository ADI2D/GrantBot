#!/bin/bash

# Regenerate APPLY_MIGRATIONS.sql from individual migration files
# This ensures the combined script matches the latest migrations

OUTPUT_FILE="grantbot-app/supabase/APPLY_MIGRATIONS.sql"

cat > "$OUTPUT_FILE" << 'HEADER'
-- ============================================================================
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
-- To regenerate: npm run regenerate-migrations
-- Last generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

HEADER

# Counter for migration sections
counter=1

# List of migrations to include (excluding the old pricing_plans migration)
migrations=(
  "20241024_initial.sql"
  "20241025_activity_logs.sql"
  "20241025_add_document_metadata.sql"
  "20241025_plan_and_usage.sql"
  "20241026_billing_payments.sql"
  "20241026_org_members_read.sql"
  "20241027_admin_tables.sql"
  "20241027_ai_costs.sql"
  "20241027_feature_flags.sql"
  "20241027_support_tables.sql"
  "20241031_fix_org_update_policy.sql"
  "20241031_storage_setup.sql"
  "20241101_add_connector_fields.sql"
  "20241101_add_proposal_archive.sql"
  "20241101_add_share_expiration.sql"
  "20241101_add_share_token.sql"
  "20241101_connector_sync_state.sql"
  "20241101_fix_grants_gov_urls.sql"
  "20241101_fix_opportunities_rls.sql"
  "20241101_pricing_plans.sql"
  "20241101_proposal_comments.sql"
  "20241101_soft_delete_proposals.sql"
  "20241101_sync_logs.sql"
)

for migration in "${migrations[@]}"; do
  migration_file="grantbot-app/supabase/migrations/$migration"

  if [ -f "$migration_file" ]; then
    # Extract migration name for section header
    migration_name=$(echo "$migration" | sed 's/^[0-9_]*//; s/.sql$//')

    echo "" >> "$OUTPUT_FILE"
    echo "-- ============================================================================" >> "$OUTPUT_FILE"
    echo "-- $counter. ${migration_name^^} ($migration)" >> "$OUTPUT_FILE"
    echo "-- ============================================================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Append migration content
    cat "$migration_file" >> "$OUTPUT_FILE"

    ((counter++))
  else
    echo "Warning: Migration file not found: $migration_file"
  fi
done

echo "" >> "$OUTPUT_FILE"
echo "-- ============================================================================" >> "$OUTPUT_FILE"
echo "-- END OF MIGRATIONS" >> "$OUTPUT_FILE"
echo "-- ============================================================================" >> "$OUTPUT_FILE"

echo "✅ Successfully regenerated $OUTPUT_FILE"
echo "📊 Included $((counter-1)) migrations"
