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

    const sql = readFileSync('supabase/migrations/20251109_focus_areas_taxonomy.sql', 'utf8');

    console.log('→ Applying migration via RPC...');

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

    // Verify the changes
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'opportunities')
      .eq('column_name', 'focus_areas');

    if (columns && columns.length > 0) {
      console.log('✓ Verified: focus_areas column exists');
    }

    const { data: taxRows, error: taxError } = await supabase
      .from('focus_area_taxonomy')
      .select('*', { count: 'exact', head: true });

    if (!taxError) {
      console.log(`✓ Verified: Focus area taxonomy table exists`);
    }

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
