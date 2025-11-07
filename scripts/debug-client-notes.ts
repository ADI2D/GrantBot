const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugClientNotes() {
  const clientId = '8b43c41e-60da-4246-84cc-d409a28b9f1d';

  console.log(`\nFetching notes for client: ${clientId}\n`);

  const { data: notes, error } = await supabase
    .from('freelancer_notes')
    .select('*')
    .eq('client_id', clientId);

  if (error) {
    console.error('Error fetching notes:', error);
    return;
  }

  console.log(`Found ${notes?.length || 0} notes:\n`);

  notes?.forEach((note, index) => {
    console.log(`\nNote #${index + 1}:`);
    console.log('  ID:', note.id);
    console.log('  Content type:', typeof note.content);
    console.log('  Content:', JSON.stringify(note.content, null, 2));
    console.log('  Created at:', note.created_at);
  });
}

debugClientNotes().catch(console.error);
