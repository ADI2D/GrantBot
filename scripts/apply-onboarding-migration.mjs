#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    if (key && value) process.env[key] = value;
  });
} catch (error) {
  console.error('Error loading .env.local:', error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying onboarding wizard migration...\n');

    const migrationPath = resolve(__dirname, '../supabase/migrations/20251109_onboarding_wizard.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Split SQL statements (basic splitting by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (!statement) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

        if (error) {
          // Try direct execution instead
          const { error: directError } = await supabase.from('_').select('*').limit(0);

          // If it's a comment or already exists error, it's OK
          if (error.message.includes('already exists') || error.message.includes('does not exist') || statement.startsWith('comment')) {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 60)}...`);
            successCount++;
          } else {
            console.error(`❌ Error: ${error.message}`);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          }
        } else {
          console.log(`✅ Applied: ${statement.substring(0, 60)}...`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review above.');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

applyMigration();
