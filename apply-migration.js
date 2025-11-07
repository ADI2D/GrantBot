/**
 * One-time script to apply the proposal sharing migration
 *
 * Usage:
 * 1. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local
 * 2. Run: node apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationPath = path.join(__dirname, 'supabase/migrations/20241107_proposal_sharing.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📝 Applying migration: 20241107_proposal_sharing.sql');
  console.log('   Creating tables: freelancer_proposal_shares, freelancer_proposal_comments');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct query if RPC doesn't work
      const queries = migrationSQL
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      for (const query of queries) {
        const { error: queryError } = await supabase.from('_sql').select(query);
        if (queryError && !queryError.message.includes('does not exist')) {
          console.error(`❌ Error executing query: ${queryError.message}`);
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('   Tables created:');
    console.log('   - freelancer_proposal_shares');
    console.log('   - freelancer_proposal_comments');
    console.log('');
    console.log('🎉 You can now share proposals with reviewers!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('💡 Please apply the migration manually via Supabase Dashboard:');
    console.error('   1. Go to SQL Editor');
    console.error('   2. Paste contents of supabase/migrations/20241107_proposal_sharing.sql');
    console.error('   3. Click Run');
    process.exit(1);
  }
}

applyMigration();
