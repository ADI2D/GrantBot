import { createClient } from '@supabase/supabase-js';

// This script checks if freelancer_clients have focus_areas populated
async function checkClientFocusAreas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all clients with their focus_areas
  const { data: clients, error } = await supabase
    .from('freelancer_clients')
    .select('id, name, focus_areas')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching clients:', error);
    process.exit(1);
  }

  console.log('\n=== Freelancer Clients Focus Areas ===\n');

  let withFocusAreas = 0;
  let withoutFocusAreas = 0;

  clients?.forEach((client) => {
    const hasFocusAreas = client.focus_areas && Array.isArray(client.focus_areas) && client.focus_areas.length > 0;

    if (hasFocusAreas) {
      withFocusAreas++;
      console.log(`✓ ${client.name}`);
      console.log(`  ID: ${client.id}`);
      console.log(`  Focus Areas: ${client.focus_areas.join(', ')}`);
    } else {
      withoutFocusAreas++;
      console.log(`✗ ${client.name}`);
      console.log(`  ID: ${client.id}`);
      console.log(`  Focus Areas: NONE (${JSON.stringify(client.focus_areas)})`);
    }
    console.log('');
  });

  console.log('=== Summary ===');
  console.log(`Clients WITH focus_areas: ${withFocusAreas}`);
  console.log(`Clients WITHOUT focus_areas: ${withoutFocusAreas}`);
  console.log(`Total checked: ${clients?.length || 0}`);
}

checkClientFocusAreas();
