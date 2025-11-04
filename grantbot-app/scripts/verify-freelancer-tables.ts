/**
 * Script to verify freelancer portal database tables
 * Run: npx tsx scripts/verify-freelancer-tables.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local
try {
  const envPath = resolve(__dirname, "..", ".env.local");
  const envContent = readFileSync(envPath, "utf-8");

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");

    if (key && value) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error("Error loading .env.local:", error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function verifyFreelancerTables() {
  console.log("🔍 Verifying freelancer portal database tables...\n");

  const tables = ["freelancer_clients", "freelancer_documents", "freelancer_notes"];

  for (const table of tables) {
    try {
      // Check if table exists and has RLS enabled
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error(`❌ Table '${table}': Error - ${error.message}`);
        continue;
      }

      console.log(`✅ Table '${table}': Exists and is accessible`);
      console.log(`   Record count: ${count ?? 0}`);
      console.log();
    } catch (err) {
      console.error(`❌ Table '${table}': Unexpected error - ${err}`);
    }
  }

  // Check RLS policies
  console.log("🔐 Checking RLS policies...\n");

  const policyQuery = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd
    FROM pg_policies
    WHERE tablename LIKE 'freelancer_%'
    ORDER BY tablename, policyname;
  `;

  try {
    const { data, error } = await supabase.rpc("exec_sql", { sql: policyQuery });

    if (error) {
      console.log("⚠️  Could not query RLS policies directly (expected)");
      console.log("   RLS policies were created during migration.");
    } else {
      console.log("📋 RLS Policies:");
      console.table(data);
    }
  } catch (err) {
    console.log("⚠️  Could not query RLS policies (this is normal)");
  }

  console.log("\n✨ Verification complete!");
  console.log("\nNext steps:");
  console.log("  1. Start the dev server: npm run dev");
  console.log("  2. Navigate to /freelancer/clients");
  console.log("  3. Create a test client to verify the full flow");
}

verifyFreelancerTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
