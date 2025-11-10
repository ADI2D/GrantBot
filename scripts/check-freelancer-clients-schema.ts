#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkSchema() {
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

  console.log('Checking freelancer_clients table schema...\n');

  try {
    // Check if table exists and what columns it has
    const { data, error } = await supabase
      .from('freelancer_clients')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying table:', error);

      // Try to get more info about the error
      if (error.message.includes('does not exist')) {
        console.log('\n❌ The freelancer_clients table does not exist!');
        console.log('You may need to run the initial migration first.');
      }
    } else {
      console.log('✓ Table exists and is queryable');

      if (data && data.length > 0) {
        console.log('\nSample row structure:');
        console.log(JSON.stringify(data[0], null, 2));
        console.log('\nColumns present:', Object.keys(data[0]).join(', '));
      } else {
        console.log('\nTable exists but has no data yet.');
        console.log('Attempting to check column names...');

        // Try a test insert to see what columns are expected
        const testData = {
          freelancer_user_id: '00000000-0000-0000-0000-000000000000',
          name: 'Test',
          status: 'active',
          focus_areas: ['health']
        };

        const { error: insertError } = await supabase
          .from('freelancer_clients')
          .insert(testData)
          .select();

        if (insertError) {
          console.log('\nTest insert error:', insertError.message);
          if (insertError.message.includes('freelancer_user_id')) {
            console.log('✓ Column freelancer_user_id appears to exist');
          }
          if (insertError.message.includes('freelancer_id')) {
            console.log('⚠ Column freelancer_id appears to be expected');
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Unexpected error:', err.message);
  }
}

checkSchema();
