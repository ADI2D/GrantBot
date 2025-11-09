/**
 * Direct SQL execution to create freelancer tables
 * This bypasses PostgREST and uses raw SQL execution
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

async function createTables() {
  console.log("🚀 Creating freelancer tables directly...\n");

  // Create tables one by one
  const statements = [
    {
      name: "freelancer_clients table",
      sql: `
        CREATE TABLE IF NOT EXISTS freelancer_clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'archived')),
          primary_contact_name TEXT,
          primary_contact_email TEXT,
          mission TEXT,
          annual_budget BIGINT,
          focus_areas TEXT[] DEFAULT '{}',
          plan_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity_at TIMESTAMPTZ
        );
      `
    },
    {
      name: "freelancer_documents table",
      sql: `
        CREATE TABLE IF NOT EXISTS freelancer_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          file_path TEXT,
          file_size BIGINT,
          mime_type TEXT,
          status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'missing', 'in_review')),
          notes TEXT,
          uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    },
    {
      name: "freelancer_notes table",
      sql: `
        CREATE TABLE IF NOT EXISTS freelancer_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'todo', 'decision')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    },
    {
      name: "freelancer_clients indexes",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_freelancer_clients_freelancer
          ON freelancer_clients(freelancer_user_id, status);
        CREATE INDEX IF NOT EXISTS idx_freelancer_clients_org
          ON freelancer_clients(organization_id);
      `
    },
    {
      name: "freelancer_documents indexes",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_freelancer_documents_client
          ON freelancer_documents(client_id, status);
        CREATE INDEX IF NOT EXISTS idx_freelancer_documents_freelancer
          ON freelancer_documents(freelancer_user_id);
      `
    },
    {
      name: "freelancer_notes indexes",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_freelancer_notes_client
          ON freelancer_notes(client_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_freelancer_notes_freelancer
          ON freelancer_notes(freelancer_user_id);
      `
    },
    {
      name: "Enable RLS",
      sql: `
        ALTER TABLE freelancer_clients ENABLE ROW LEVEL SECURITY;
        ALTER TABLE freelancer_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE freelancer_notes ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: "RLS policies for freelancer_clients",
      sql: `
        DO $$ BEGIN
          CREATE POLICY "Freelancers can view their own clients"
            ON freelancer_clients FOR SELECT
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can insert their own clients"
            ON freelancer_clients FOR INSERT
            WITH CHECK (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can update their own clients"
            ON freelancer_clients FOR UPDATE
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can delete their own clients"
            ON freelancer_clients FOR DELETE
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `
    },
    {
      name: "RLS policies for freelancer_documents",
      sql: `
        DO $$ BEGIN
          CREATE POLICY "Freelancers can view their own documents"
            ON freelancer_documents FOR SELECT
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can insert their own documents"
            ON freelancer_documents FOR INSERT
            WITH CHECK (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can update their own documents"
            ON freelancer_documents FOR UPDATE
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can delete their own documents"
            ON freelancer_documents FOR DELETE
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `
    },
    {
      name: "RLS policies for freelancer_notes",
      sql: `
        DO $$ BEGIN
          CREATE POLICY "Freelancers can view their own notes"
            ON freelancer_notes FOR SELECT
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can insert their own notes"
            ON freelancer_notes FOR INSERT
            WITH CHECK (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can update their own notes"
            ON freelancer_notes FOR UPDATE
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
          CREATE POLICY "Freelancers can delete their own notes"
            ON freelancer_notes FOR DELETE
            USING (auth.uid() = freelancer_user_id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `
    },
  ];

  for (const statement of statements) {
    try {
      console.log(`Creating ${statement.name}...`);
      const { error } = await supabase.rpc("exec_sql", { sql: statement.sql });

      if (error) {
        console.error(`❌ Failed: ${error.message}`);
      } else {
        console.log(`✅ ${statement.name} created`);
      }
    } catch (err) {
      console.error(`❌ Error with ${statement.name}:`, err);
    }
  }

  console.log("\n✨ Done! Please check your Supabase dashboard to verify tables were created.");
}

createTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
  });
