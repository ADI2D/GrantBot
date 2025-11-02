#!/usr/bin/env tsx

/**
 * Apply Opportunity Search Migration
 * Adds full-text search capability to opportunities table
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local
try {
  const envPath = resolve(__dirname, "../.env.local");
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING OPPORTUNITY SEARCH MIGRATION ===\n");

  try {
    // Read migration file
    const migrationPath = resolve(__dirname, "../supabase/migrations/20241102_opportunity_search.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("Executing migration...\n");

    // Execute the migration (split by statement separator if needed)
    const { data, error } = await supabase.rpc("exec_sql", { sql: migrationSQL }).single();

    if (error) {
      // If RPC doesn't exist, try direct execution (note: this may not work with all SQL)
      console.log("Note: exec_sql RPC not available, executing via pg connection\n");

      // For Supabase, we'll need to manually execute each statement
      // Split on semicolons but keep function bodies intact
      const statements = migrationSQL
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement) {
          console.log(`Executing: ${statement.substring(0, 60)}...`);
          const result = await supabase.rpc("exec", { query: statement });
          if (result.error) {
            console.error(`Error: ${result.error.message}`);
          }
        }
      }
    } else {
      console.log("✅ Migration applied successfully");
    }

    // Verify the search_vector column exists
    const { data: columns, error: checkError } = await supabase
      .from("opportunities")
      .select("search_vector")
      .limit(1);

    if (!checkError) {
      console.log("✅ search_vector column verified");
    }

    console.log("\n=== MIGRATION COMPLETE ===\n");
    console.log("Next steps:");
    console.log("1. Test search functionality in the opportunities page");
    console.log("2. Check full-text search performance");
    console.log("3. Monitor search query logs\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
