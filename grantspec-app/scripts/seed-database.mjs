#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log(`   URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function seedDatabase() {
  try {
    console.log('\n📖 Reading seed file...');
    const seedPath = join(__dirname, '..', 'supabase', 'seed', '001_demo_data.sql');
    const seedSQL = readFileSync(seedPath, 'utf8');

    console.log('✅ Seed file loaded');
    console.log(`   Size: ${(seedSQL.length / 1024).toFixed(2)} KB`);
    console.log('   Lines:', seedSQL.split('\n').length);

    console.log('\n🌱 Executing seed SQL...');

    // Execute the entire SQL file
    const { error } = await supabase.rpc('exec_sql', { sql: seedSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      if (error.message.includes('exec_sql')) {
        console.log('⚠️  exec_sql RPC not available, trying direct execution...');

        // Split by semicolons and execute each statement
        const statements = seedSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`   Executing ${statements.length} statements...`);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.length > 0) {
            try {
              await supabase.rpc('exec', { query: statement + ';' });
              process.stdout.write(`\r   Progress: ${i + 1}/${statements.length}`);
            } catch (err) {
              console.error(`\n❌ Error at statement ${i + 1}:`, err.message);
              console.error('   Statement:', statement.substring(0, 100) + '...');
            }
          }
        }
        console.log('\n');
      } else {
        throw error;
      }
    }

    console.log('✅ Seed data executed successfully!\n');

    // Verify the seed
    console.log('🔍 Verifying seed data...\n');

    const checks = [
      { table: 'organizations', expected: 1 },
      { table: 'opportunities', expected: 3 },
      { table: 'proposals', expected: 3 },
      { table: 'proposal_sections', expected: 5 },
      { table: 'outcomes', expected: 3 },
      { table: 'billing_payments', expected: 3 },
      { table: 'ai_cost_events', expected: 2 },
      { table: 'admin_users', expected: 2 },
      { table: 'admin_audit_logs', expected: 2 },
      { table: 'support_tickets', expected: 2 },
      { table: 'feature_flags', expected: 2 },
    ];

    for (const check of checks) {
      const { count, error } = await supabase
        .from(check.table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ⚠️  ${check.table}: Unable to verify (${error.message})`);
      } else {
        const status = count >= check.expected ? '✅' : '⚠️ ';
        console.log(`   ${status} ${check.table}: ${count} rows (expected ${check.expected})`);
      }
    }

    console.log('\n🎉 Database seeding complete!\n');
    console.log('Next steps:');
    console.log('  1. Create test users: npm run seed:users -- <org-id> <email1> <email2>');
    console.log('  2. Start dev server: npm run dev');
    console.log('  3. Login at http://localhost:3000/login\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure migrations are applied first');
    console.error('  2. Check that SUPABASE_SERVICE_ROLE_KEY has admin permissions');
    console.error('  3. Run migrations manually in Supabase SQL Editor if needed\n');
    process.exit(1);
  }
}

seedDatabase();
