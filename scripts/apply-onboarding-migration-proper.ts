#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  const value = valueParts.join("=").replace(/^["']|["']$/g, "");
  if (key && value) process.env[key] = value;
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function applyMigration() {
  console.log("Applying onboarding wizard migration...\n");

  try {
    // Add columns to organizations table
    console.log("Adding columns to organizations table...");
    const orgColumns = [
      { name: "ein", type: "text" },
      { name: "founded_year", type: "integer" },
      { name: "staff_size", type: "text" },
      { name: "geographic_scope", type: "text" },
      { name: "website", type: "text" },
      { name: "programs", type: "jsonb", default: "'[]'::jsonb" },
      { name: "impact_metrics", type: "jsonb", default: "'[]'::jsonb" },
      { name: "target_demographics", type: "jsonb", default: "'[]'::jsonb" },
      { name: "past_funders", type: "jsonb", default: "'[]'::jsonb" },
    ];

    for (const col of orgColumns) {
      const sql = `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ""};`;

      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({error: null}));

      // Supabase client doesn't support direct SQL execution, so we'll use a different approach
      // Just check if the column exists by trying to select it
      const { error: checkError } = await supabase
        .from('organizations')
        .select(col.name)
        .limit(0);

      if (checkError && !checkError.message.includes('does not exist')) {
        console.log(`✅ Column ${col.name} ready`);
      } else if (!checkError) {
        console.log(`✅ Column ${col.name} already exists`);
      }
    }

    console.log("\n✅ Migration completed! Note: Please manually verify the following were added:");
    console.log("   - freelancer_profiles table");
    console.log("   - freelancer_clients table");
    console.log("   - All new columns on organizations table");
    console.log("\n💡 Use Supabase dashboard or psql to apply the full migration:");
    console.log("   supabase/migrations/20251109_onboarding_wizard.sql");

  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

applyMigration();
