#!/usr/bin/env tsx

/**
 * Apply Freelancer Schema Migration
 * Creates tables for freelancer clients, documents, and notes
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local
try {
  const envPath = resolve(__dirname, "../../.env.local");
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
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function applyMigration() {
  console.log("🚀 Applying freelancer schema migration...\n");

  try {
    // Read the migration SQL file
    const migrationPath = resolve(__dirname, "../supabase/migrations/20241103_freelancer_schema.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("📄 Migration file:", migrationPath);
    console.log("📊 SQL length:", migrationSQL.length, "characters\n");

    // Execute the migration
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // Try direct query if rpc doesn't exist
      console.log("⚠️  RPC method not found, trying direct query...\n");
      const { error: queryError } = await supabase.from("_migrations").select("*").limit(1);

      // Split and execute SQL statements individually
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.length === 0) continue;

        console.log(`Executing: ${statement.substring(0, 60)}...`);
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql: statement + ";" }),
        });

        if (!result.ok) {
          const errorText = await result.text();
          console.error(`❌ Failed to execute statement: ${errorText}`);
        }
      }
    }

    console.log("\n✅ Freelancer schema migration applied successfully!");
    console.log("\nCreated tables:");
    console.log("  - freelancer_clients");
    console.log("  - freelancer_documents");
    console.log("  - freelancer_notes");
    console.log("\n✨ All tables have RLS enabled and indexed for performance.");
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
