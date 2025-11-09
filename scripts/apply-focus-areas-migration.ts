import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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
    path.join(process.cwd(), 'supabase/migrations/20251109_focus_areas_taxonomy.sql'),
    'utf8'
  );

  // Execute via SQL editor - user will need to copy/paste
  console.log('='.repeat(80));
  console.log('MIGRATION SQL');
  console.log('='.repeat(80));
  console.log('\nPlease run this SQL in your Supabase SQL Editor:');
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
    // Check for focus_areas column
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('id, focus_areas')
      .limit(1);

    if (opportunities) {
      console.log('✓ opportunities.focus_areas column exists');
    }

    // Check for taxonomy table
    const { data: taxonomy, error: taxError } = await supabase
      .from('focus_area_taxonomy')
      .select('*');

    if (!taxError && taxonomy) {
      console.log(`✓ focus_area_taxonomy table exists with ${taxonomy.length} entries`);
      console.log('\nFocus areas:');
      taxonomy.forEach(area => {
        console.log(`  - ${area.label} (${area.id})`);
      });
    }

    // Check for organizations.focus_areas
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, focus_areas')
      .limit(1);

    if (orgs) {
      console.log('✓ organizations.focus_areas column exists');
    }

    console.log('\n✓ Migration verified successfully!');

  } catch (error: any) {
    console.error('✗ Verification failed:', error.message);
    console.error('\nPlease ensure you ran the SQL in your Supabase dashboard.');
    process.exit(1);
  }

  process.exit(0);
}

applyMigration();
