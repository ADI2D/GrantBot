#!/usr/bin/env node

/**
 * Pre-Migration Backup Script
 *
 * Creates a local backup of critical tables before applying migrations.
 * This serves as a safety net for the free Supabase plan that doesn't have manual backups.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupTable(tableName, fileName) {
  console.log(`📦 Backing up ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`   ⚠️  ${tableName}: No data (or table doesn't exist)`);
      return null;
    }

    const backupData = {
      table: tableName,
      backedUpAt: new Date().toISOString(),
      rowCount: data.length,
      data: data
    };

    const filePath = join(process.cwd(), 'backups', fileName);
    await writeFile(filePath, JSON.stringify(backupData, null, 2));

    console.log(`   ✅ Backed up ${data.length} rows to ${fileName}`);
    return data.length;
  } catch (error) {
    console.error(`   ❌ Error backing up ${tableName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Pre-Migration Backup');
  console.log('═══════════════════════════════════════════════════════════\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Create backups directory
  const { mkdir } = await import('fs/promises');
  try {
    await mkdir('backups', { recursive: true });
  } catch (e) {
    // Directory might already exist
  }

  // Tables to backup
  const tables = [
    { name: 'proposals', file: `${timestamp}_proposals.json` },
    { name: 'freelancer_proposals', file: `${timestamp}_freelancer_proposals.json` },
    { name: 'organizations', file: `${timestamp}_organizations.json` },
    { name: 'freelancer_clients', file: `${timestamp}_freelancer_clients.json` },
    { name: 'proposal_sections', file: `${timestamp}_proposal_sections.json` },
  ];

  let totalRows = 0;
  let successCount = 0;

  for (const table of tables) {
    const count = await backupTable(table.name, table.file);
    if (count !== null) {
      totalRows += count;
      successCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Backup Complete');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Backed up ${successCount} tables`);
  console.log(`📊 Total rows backed up: ${totalRows}`);
  console.log(`📁 Backup location: ./backups/\n`);
  console.log('Next steps:');
  console.log('1. Proceed with migrations');
  console.log('2. If rollback needed, use restore-from-backup.mjs\n');
}

main().catch(error => {
  console.error('\n❌ Backup failed:', error);
  process.exit(1);
});
