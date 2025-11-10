import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('✗ Missing SUPABASE credentials in .env.local');
    console.error('  Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✓ Connected to Supabase');
  console.log('→ Reading migration file...\n');

  const sql = readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20251110_fix_freelancer_clients_column_name.sql'),
    'utf8'
  );

  console.log('='.repeat(80));
  console.log('MIGRATION: Fix freelancer_clients column name');
  console.log('='.repeat(80));
  console.log('\nThis migration will:');
  console.log('1. Rename freelancer_id → freelancer_user_id');
  console.log('2. Update the index to use correct column name');
  console.log('3. Update RLS policies');
  console.log('\n' + '='.repeat(80) + '\n');

  // Output SQL for manual execution
  console.log('Please run this SQL in your Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/_/sql\n');
  console.log('-'.repeat(80));
  console.log(sql);
  console.log('-'.repeat(80));
  console.log('\nAfter running the SQL, press Enter to verify...');

  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve(null));
  });

  // Verify the migration
  console.log('\n→ Verifying migration...');

  try {
    // Try to query freelancer_clients with the new column name
    const { data: clients, error } = await supabase
      .from('freelancer_clients')
      .select('id, freelancer_user_id, name')
      .limit(1);

    if (error) {
      throw new Error(`Failed to query freelancer_clients: ${error.message}`);
    }

    console.log('✓ freelancer_clients.freelancer_user_id column exists and is queryable');

    // Check if we can read the schema
    console.log('✓ Migration verified successfully!');
    console.log('\nThe client creation error should now be fixed.');

  } catch (error: any) {
    console.error('✗ Verification failed:', error.message);
    console.error('\nPlease ensure you ran the SQL in your Supabase dashboard.');
    process.exit(1);
  }

  process.exit(0);
}

applyMigration();
