#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
try {
  const envPath = resolve(__dirname, '../.env.local');
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('=== DIAGNOSING OPPORTUNITY MATCHING ===\n');

  // 1. Check what focus areas exist in opportunities table
  console.log('1. Checking unique focus_area values in opportunities table:');
  const { data: focusAreaData, error: focusError } = await supabase
    .from('opportunities')
    .select('focus_area')
    .not('focus_area', 'is', null)
    .limit(1000);

  if (focusError) {
    console.error('Error fetching focus areas:', focusError);
  } else {
    const uniqueFocusAreas = [...new Set(focusAreaData?.map(o => o.focus_area))];
    console.log('Unique focus_area values:', uniqueFocusAreas);
    console.log(`Total unique: ${uniqueFocusAreas.length}\n`);
  }

  // 2. Count opportunities by focus area
  console.log('2. Counting opportunities by focus_area:');
  const focusAreaCounts: Record<string, number> = {};
  focusAreaData?.forEach(o => {
    if (o.focus_area) {
      focusAreaCounts[o.focus_area] = (focusAreaCounts[o.focus_area] || 0) + 1;
    }
  });
  Object.entries(focusAreaCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([area, count]) => {
      console.log(`  ${area}: ${count}`);
    });
  console.log();

  // 3. Check freelancer_clients table
  console.log('3. Checking freelancer_clients:');
  const { data: clients, error: clientsError } = await supabase
    .from('freelancer_clients')
    .select('id, name, focus_areas');

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  } else {
    console.log(`Found ${clients?.length || 0} clients:`);
    clients?.forEach(c => {
      console.log(`  - ${c.name}: ${JSON.stringify(c.focus_areas)}`);
    });
    console.log();
  }

  // 4. Test the matching logic
  if (clients && clients.length > 0) {
    console.log('4. Testing matching logic for first client:');
    const testClient = clients[0];
    console.log(`Client: ${testClient.name}`);
    console.log(`Focus areas (raw): ${JSON.stringify(testClient.focus_areas)}`);

    // Import the helper
    const { getFocusAreaLabels } = await import('../src/types/focus-areas');
    const labels = getFocusAreaLabels(testClient.focus_areas || []);
    console.log(`Focus area labels: ${JSON.stringify(labels)}`);

    // Try to query with these labels
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    const { count, error: countError } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .in('focus_area', labels)
      .gte('deadline', sixtyDaysAgoStr)
      .neq('status', 'closed');

    if (countError) {
      console.error('Error counting:', countError);
    } else {
      console.log(`Matching opportunities: ${count}`);
    }

    // Also try without date filter
    const { count: countAll, error: countAllError } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .in('focus_area', labels);

    if (!countAllError) {
      console.log(`Total matching opportunities (no date filter): ${countAll}`);
    }
  }

  console.log('\n=== DIAGNOSIS COMPLETE ===');
}

diagnose();
