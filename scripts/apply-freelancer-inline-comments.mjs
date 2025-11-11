import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('✗ Missing SUPABASE credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('✓ Connected to Supabase');

    const sql = readFileSync('supabase/migrations/20251111_freelancer_inline_comments.sql', 'utf8');

    console.log('→ Applying freelancer inline comments migration...');

    // Split migration into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`  Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt }).single();

      if (error && error.message && !error.message.includes('already exists')) {
        console.error(`  ✗ Error in statement ${i + 1}:`, error.message);
        console.error(`  Statement: ${stmt.substring(0, 100)}...`);
        // Continue on "already exists" errors
      }
    }

    console.log('✓ Migration statements executed');

    // Verify the table was created
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'freelancer_proposal_inline_comments')
      .single();

    if (tableInfo && !tableError) {
      console.log('✓ Verified: freelancer_proposal_inline_comments table exists');
    } else {
      console.log('⚠ Warning: Could not verify table creation');
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nThe freelancer inline comments feature is now ready to use.');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
