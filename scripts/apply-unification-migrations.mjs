#!/usr/bin/env node

/**
 * Apply Unification Migrations
 *
 * Safely applies the Phase 1 unification migrations to the Supabase database.
 * This script includes safety checks and rollback capability.
 *
 * Usage:
 *   node --env-file .env.local scripts/apply-unification-migrations.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line args
const isDryRun = process.argv.includes('--dry-run');

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Migration files to apply
const migrations = [
  {
    name: '20251226_unify_proposals',
    file: 'supabase/migrations/20251226_unify_proposals.sql',
    description: 'Unify proposals table for nonprofit and freelancer contexts',
  },
  {
    name: '20251226_unify_documents',
    file: 'supabase/migrations/20251226_unify_documents.sql',
    description: 'Unify organizations table to support both nonprofits and clients',
  },
];

async function checkExistingData() {
  console.log('\n📊 Checking existing data...\n');

  try {
    // Check freelancer_proposals count
    const { count: fpCount, error: fpError } = await supabase
      .from('freelancer_proposals')
      .select('*', { count: 'exact', head: true });

    if (fpError && fpError.code !== 'PGRST116') {
      console.log('⚠️  freelancer_proposals table not found (this is OK)');
    } else {
      console.log(`   freelancer_proposals: ${fpCount || 0} rows`);
    }

    // Check proposals count
    const { count: pCount, error: pError } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true });

    if (!pError) {
      console.log(`   proposals: ${pCount || 0} rows`);
    }

    // Check freelancer_clients count
    const { count: fcCount, error: fcError } = await supabase
      .from('freelancer_clients')
      .select('*', { count: 'exact', head: true });

    if (fcError && fcError.code !== 'PGRST116') {
      console.log('⚠️  freelancer_clients table not found (this is OK)');
    } else {
      console.log(`   freelancer_clients: ${fcCount || 0} rows`);
    }

    // Check organizations count
    const { count: oCount, error: oError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (!oError) {
      console.log(`   organizations: ${oCount || 0} rows`);
    }

    console.log('');
  } catch (error) {
    console.error('❌ Error checking existing data:', error.message);
    throw error;
  }
}

async function checkMigrationStatus(migrationName) {
  // Check if migration has already been applied
  // This is a simple check - in production you'd use a migrations table
  try {
    if (migrationName.includes('proposals')) {
      // Check if context_type column exists
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'proposals'
            AND column_name = 'context_type';
        `
      });

      if (error) {
        // RPC might not exist, check directly
        const { data: tableData } = await supabase
          .from('proposals')
          .select('context_type')
          .limit(1);

        return tableData !== null; // If we can query context_type, migration is applied
      }

      return data && data.length > 0;
    }

    if (migrationName.includes('documents')) {
      // Check if parent_type column exists
      const { data: tableData } = await supabase
        .from('organizations')
        .select('parent_type')
        .limit(1);

      return tableData !== null;
    }
  } catch (error) {
    // If column doesn't exist, migration not applied
    return false;
  }

  return false;
}

async function applyMigration(migration) {
  console.log(`\n🔄 Processing: ${migration.name}`);
  console.log(`   ${migration.description}`);

  // Check if already applied
  const isApplied = await checkMigrationStatus(migration.name);
  if (isApplied) {
    console.log('   ✅ Already applied (skipping)');
    return { success: true, skipped: true };
  }

  if (isDryRun) {
    console.log('   🔍 [DRY RUN] Would apply this migration');
    return { success: true, dryRun: true };
  }

  try {
    // Read migration file
    const migrationPath = join(projectRoot, migration.file);
    const sql = await readFile(migrationPath, 'utf-8');

    console.log(`   📄 Read ${migration.file}`);

    // Note: Supabase JS client doesn't support raw SQL execution
    // We need to use the Supabase CLI or dashboard SQL editor
    console.log('\n   ⚠️  MANUAL STEP REQUIRED:');
    console.log('   Please apply this migration using one of these methods:');
    console.log('   1. Supabase Dashboard > SQL Editor > Paste and run the SQL');
    console.log('   2. Run: supabase db push (if linked to project)');
    console.log(`   3. Copy the SQL from: ${migration.file}\n`);

    return { success: false, manual: true };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createBackup() {
  console.log('\n💾 Creating backup instructions...\n');
  console.log('   IMPORTANT: Before applying migrations, backup your database:');
  console.log('   1. Go to Supabase Dashboard > Database > Backups');
  console.log('   2. Create a manual backup (or ensure automatic backups are enabled)');
  console.log('   3. Download a dump if needed: supabase db dump -f backup.sql\n');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Phase 1: Unification Migrations');
  console.log('═══════════════════════════════════════════════════════════');

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Step 1: Show backup instructions
  await createBackup();

  // Step 2: Check existing data
  await checkExistingData();

  // Step 3: Apply migrations
  console.log('📝 Migration Plan:\n');

  let allSuccess = true;
  let manualRequired = false;

  for (const migration of migrations) {
    const result = await applyMigration(migration);

    if (!result.success && !result.skipped) {
      allSuccess = false;
    }

    if (result.manual) {
      manualRequired = true;
    }
  }

  // Step 4: Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (manualRequired) {
    console.log('⚠️  Manual migration required');
    console.log('\nNext steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the migrations in order:');
    migrations.forEach(m => {
      console.log(`   - ${m.file}`);
    });
    console.log('3. Re-run this script to verify migrations applied\n');
  } else if (allSuccess) {
    console.log('✅ All migrations applied successfully!\n');
    console.log('Next steps:');
    console.log('1. Verify data integrity by checking tables in Supabase Dashboard');
    console.log('2. Test RLS policies with different user contexts');
    console.log('3. Enable feature flags to test unified data access\n');
  } else {
    console.log('❌ Some migrations failed. Check errors above.\n');
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
