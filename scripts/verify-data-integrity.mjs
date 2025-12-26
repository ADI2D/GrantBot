#!/usr/bin/env node

/**
 * Verify Data Integrity After Migration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Data Integrity Verification');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Check proposal counts
  console.log('📊 Proposal Counts:\n');

  const { count: totalProposals } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  const { count: orgProposals } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .or('context_type.eq.organization,context_type.is.null');

  const { count: freelancerProposals } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .eq('context_type', 'freelancer');

  console.log(`   Total proposals: ${totalProposals}`);
  console.log(`   Organization proposals: ${orgProposals}`);
  console.log(`   Freelancer proposals: ${freelancerProposals}`);

  // 2. Check proposal drafts
  const { count: draftCount } = await supabase
    .from('proposal_drafts')
    .select('*', { count: 'exact', head: true });

  console.log(`   Proposal drafts: ${draftCount}\n`);

  // 3. Check organization counts
  console.log('🏢 Organization Counts:\n');

  const { count: totalOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  const { count: nonprofits } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .or('parent_type.eq.nonprofit,parent_type.is.null');

  const { count: clients } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('parent_type', 'client');

  console.log(`   Total organizations: ${totalOrgs}`);
  console.log(`   Nonprofits: ${nonprofits}`);
  console.log(`   Clients: ${clients}\n`);

  // 4. Sample data check
  console.log('🔍 Sample Data:\n');

  const { data: sampleProposal } = await supabase
    .from('proposals')
    .select('id, opportunity_name, status, context_type, context_id')
    .eq('context_type', 'freelancer')
    .limit(1)
    .single();

  if (sampleProposal) {
    console.log('   Sample freelancer proposal:');
    console.log(`   - ID: ${sampleProposal.id}`);
    console.log(`   - Name: ${sampleProposal.opportunity_name}`);
    console.log(`   - Status: ${sampleProposal.status}`);
    console.log(`   - Context: ${sampleProposal.context_type}`);
    console.log(`   - Client ID: ${sampleProposal.context_id}\n`);
  }

  const { data: sampleClient } = await supabase
    .from('organizations')
    .select('id, name, parent_type, freelancer_user_id')
    .eq('parent_type', 'client')
    .limit(1)
    .single();

  if (sampleClient) {
    console.log('   Sample client organization:');
    console.log(`   - ID: ${sampleClient.id}`);
    console.log(`   - Name: ${sampleClient.name}`);
    console.log(`   - Type: ${sampleClient.parent_type}`);
    console.log(`   - Owner: ${sampleClient.freelancer_user_id}\n`);
  }

  // 5. Verification summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Verification Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  const expectedTotal = 14; // 7 original + 7 freelancer
  const expectedClients = 5;

  let allGood = true;

  if (totalProposals !== expectedTotal) {
    console.log(`   ⚠️  Expected ${expectedTotal} total proposals, got ${totalProposals}`);
    allGood = false;
  } else {
    console.log(`   ✅ Correct number of proposals (${totalProposals})`);
  }

  if (freelancerProposals !== 7) {
    console.log(`   ⚠️  Expected 7 freelancer proposals, got ${freelancerProposals}`);
    allGood = false;
  } else {
    console.log(`   ✅ All freelancer proposals migrated (${freelancerProposals})`);
  }

  if (clients !== expectedClients) {
    console.log(`   ⚠️  Expected ${expectedClients} clients, got ${clients}`);
    allGood = false;
  } else {
    console.log(`   ✅ All clients migrated (${clients})`);
  }

  if (allGood) {
    console.log('\n🎉 All data integrity checks passed!\n');
    console.log('✅ Safe to proceed with testing the application.\n');
  } else {
    console.log('\n⚠️  Some data counts don\'t match expectations.');
    console.log('   Review the numbers above and investigate if needed.\n');
  }
}

main().catch(console.error);
