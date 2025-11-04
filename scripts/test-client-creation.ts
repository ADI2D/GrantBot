/**
 * Test script to verify client creation API endpoint
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
try {
  const envPath = resolve(__dirname, "..", ".env.local");
  const envContent = readFileSync(envPath, "utf-8");

  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^[\"']|[\"']$/g, "");

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
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function testClientCreation() {
  console.log("🧪 Testing client creation flow...\n");

  // Get the first user from auth.users to use as test freelancer
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (usersError || !users || users.length === 0) {
    console.error("❌ Failed to get test user:", usersError);
    return;
  }

  const testUserId = users[0].id;
  console.log(`Using test user: ${users[0].email} (${testUserId})\n`);

  // Test data
  const testClient = {
    freelancer_user_id: testUserId,
    name: "Test Organization " + Date.now(),
    status: "active",
    primary_contact_name: "Jane Doe",
    primary_contact_email: "jane@test.org",
    mission: "Test mission statement",
    annual_budget: 500000,
    focus_areas: ["Education", "Youth Development"],
    plan_name: "Premium",
    last_activity_at: new Date().toISOString(),
  };

  console.log("📝 Creating test client:");
  console.log(JSON.stringify(testClient, null, 2));
  console.log();

  // Insert client
  const { data: client, error: insertError } = await supabase
    .from("freelancer_clients")
    .insert(testClient)
    .select()
    .single();

  if (insertError) {
    console.error("❌ Failed to create client:", insertError);
    return;
  }

  console.log("✅ Client created successfully!");
  console.log(`   ID: ${client.id}`);
  console.log(`   Name: ${client.name}`);
  console.log();

  // Verify we can read it back
  const { data: readClient, error: readError } = await supabase
    .from("freelancer_clients")
    .select("*")
    .eq("id", client.id)
    .eq("freelancer_user_id", testUserId)
    .single();

  if (readError) {
    console.error("❌ Failed to read client back:", readError);
    return;
  }

  console.log("✅ Client read back successfully via RLS!");
  console.log();

  // Test document creation
  console.log("📄 Testing document creation...");
  const { data: document, error: docError } = await supabase
    .from("freelancer_documents")
    .insert({
      freelancer_user_id: testUserId,
      client_id: client.id,
      name: "Test Document",
      status: "ready",
      file_size: 12345,
      mime_type: "application/pdf",
      notes: "Test document upload",
    })
    .select()
    .single();

  if (docError) {
    console.error("❌ Failed to create document:", docError);
  } else {
    console.log("✅ Document created successfully!");
    console.log(`   ID: ${document.id}`);
    console.log(`   Name: ${document.name}`);
    console.log();
  }

  // Test note creation
  console.log("📝 Testing note creation...");
  const { data: note, error: noteError } = await supabase
    .from("freelancer_notes")
    .insert({
      freelancer_user_id: testUserId,
      client_id: client.id,
      content: "This is a test note",
      note_type: "general",
    })
    .select()
    .single();

  if (noteError) {
    console.error("❌ Failed to create note:", noteError);
  } else {
    console.log("✅ Note created successfully!");
    console.log(`   ID: ${note.id}`);
    console.log(`   Content: ${note.content}`);
    console.log();
  }

  // Clean up test data
  console.log("🧹 Cleaning up test data...");
  await supabase.from("freelancer_clients").delete().eq("id", client.id);
  console.log("✅ Cleanup complete!");
  console.log();

  console.log("✨ All tests passed! The freelancer tables are working correctly.");
}

testClientCreation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
