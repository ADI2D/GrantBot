#!/usr/bin/env node

/**
 * Verify Migration Status
 *
 * Checks if Phase 1 migrations have been applied successfully
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration1() {
  console.log('\n📋 Checking Migration 1: Unify Proposals\n');

  try {
    // Check if new columns exist
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('context_type, context_id, freelancer_user_id')
      .limit(1);

    if (error) {
      console.log('   ❌ Migration 1 NOT applied');
      console.log('   Reason: New columns do not exist');
      return false;
    }

    console.log('   ✅ New columns exist in proposals table');

    // Check if proposal_drafts table exists
    const { data: drafts, error: draftsError } = await supabase
      .from('proposal_drafts')
      .select('id')
      .limit(1);

    if (draftsError && draftsError.code === 'PGRST116') {
      console.log('   ❌ proposal_drafts table does not exist');
      return false;
    }

    console.log('   ✅ proposal_drafts table exists');

    // Check if data was migrated
    const { count, error: countError } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('context_type', 'freelancer');

    if (!countError) {
      console.log(`   ✅ Freelancer proposals migrated: ${count || 0} rows`);
    }

    console.log('\n   ✅ Migration 1 SUCCESSFULLY APPLIED\n');
    return true;

  } catch (error) {
    console.log('   ❌ Error checking migration:', error.message);
    return false;
  }
}

async function checkMigration2() {
  console.log('📋 Checking Migration 2: Unify Documents\n');

  try {
    // Check if new columns exist in organizations
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('parent_type, freelancer_user_id')
      .limit(1);

    if (error) {
      console.log('   ❌ Migration 2 NOT applied');
      console.log('   Reason: New columns do not exist');
      return false;
    }

    console.log('   ✅ New columns exist in organizations table');

    // Check if clients were migrated
    const { count, error: countError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('parent_type', 'client');

    if (!countError) {
      console.log(`   ✅ Clients migrated: ${count || 0} rows`);
    }

    console.log('\n   ✅ Migration 2 SUCCESSFULLY APPLIED\n');
    return true;

  } catch (error) {
    console.log('   ❌ Error checking migration:', error.message);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Migration Status Check');
  console.log('═══════════════════════════════════════════════════════════');

  const migration1 = await checkMigration1();
  const migration2 = await checkMigration2();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Migration 1 (Proposals): ${migration1 ? '✅ Applied' : '❌ Not Applied'}`);
  console.log(`Migration 2 (Documents): ${migration2 ? '✅ Applied' : '❌ Not Applied'}`);

  if (migration1 && migration2) {
    console.log('\n🎉 All migrations successfully applied!\n');
    console.log('Next steps:');
    console.log('1. Test the application');
    console.log('2. Enable feature flags if needed');
    console.log('3. Monitor for any issues\n');
  } else if (migration1 && !migration2) {
    console.log('\n⚠️  Migration 1 complete, Migration 2 pending\n');
    console.log('Next step: Apply Migration 2');
    console.log('File: supabase/migrations/20251226_unify_documents.sql\n');
  } else {
    console.log('\n⚠️  Migrations need to be applied\n');
    console.log('Next step: Apply migrations via Supabase SQL Editor');
    console.log('1. supabase/migrations/20251226_unify_proposals.sql');
    console.log('2. supabase/migrations/20251226_unify_documents.sql\n');
  }
}

main().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
