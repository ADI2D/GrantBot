#!/usr/bin/env node

/**
 * Seed GrantSpec with admin + subscriber users.
 *
 * Usage:
 *   node --env-file .env.local scripts/seed-users.mjs <org-id> <admin-email> <subscriber-email> [admin-password] [subscriber-password]
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [
  ,
  ,
  orgId,
  adminEmail,
  subscriberEmail,
  adminPasswordArg,
  subscriberPasswordArg,
  supportEmail,
  supportPasswordArg,
] = process.argv;

if (!orgId || !adminEmail || !subscriberEmail) {
  console.error(
    "Usage: node --env-file .env.local scripts/seed-users.mjs <org-id> <admin-email> <subscriber-email> [admin-password] [subscriber-password] [support-email] [support-password]",
  );
  process.exit(1);
}

const requiredEnvs = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = requiredEnvs.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;
  const target = email.toLowerCase();

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function ensureUser(email, password, attributes = {}) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`User ${email} already exists.`);
    return existing;
  }

  const passwordToUse = password ?? `Temp${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}!`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: passwordToUse,
    email_confirm: true,
    ...attributes,
  });
  if (error?.message?.includes("User already registered")) {
    const user = await findUserByEmail(email);
    if (user) {
      console.log(`User ${email} already exists.`);
      return user;
    }
  }

  if (error || !data?.user) {
    throw error ?? new Error(`Failed to create user ${email}`);
  }

  console.log(`Created user ${email} with temporary password: ${passwordToUse}`);
  return data.user;
}

async function ensureMembership(userId, role) {
  const { data } = await supabase
    .from("org_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.id) {
    console.log(`Membership already exists for ${userId} in org ${orgId}`);
    return data.id;
  }

  const { data: inserted, error } = await supabase
    .from("org_members")
    .insert({ organization_id: orgId, user_id: userId, role })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    throw error ?? new Error("Failed to create membership");
  }

  console.log(`Added ${role} membership for ${userId}`);
  return inserted.id;
}

async function ensureAdminRole(userId, role) {
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.user_id) {
    console.log(`Admin role already set for ${userId}`);
    return data.user_id;
  }

  const { error } = await supabase.from("admin_users").insert({
    user_id: userId,
    role,
  });

  if (error) {
    throw error;
  }

  console.log(`Assigned admin role ${role} to ${userId}`);
  return userId;
}

(async () => {
  try {
    const adminUser = await ensureUser(adminEmail, adminPasswordArg, {
      user_metadata: { role: "owner" },
    });
    await ensureMembership(adminUser.id, "owner");
    await ensureAdminRole(adminUser.id, "super_admin");

    const subscriberUser = await ensureUser(subscriberEmail, subscriberPasswordArg, {
      user_metadata: { role: "member" },
    });
    await ensureMembership(subscriberUser.id, "member");
    await ensureAdminRole(subscriberUser.id, "read_only");

    if (supportEmail) {
      const supportUser = await ensureUser(supportEmail, supportPasswordArg, {
        user_metadata: { role: "support" },
      });
      await ensureAdminRole(supportUser.id, "support");
      console.log(`Support user ready: ${supportEmail}`);
    }

    const { error: auditInsertError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: adminUser.id,
      actor_role: "super_admin",
      action: "seed:account_initialized",
      target_type: "organization",
      target_id: orgId,
      metadata: { script: "seed-users" },
    });

    if (auditInsertError) {
      console.warn("Failed to seed audit log:", auditInsertError.message);
    }

    console.log("Seeding complete.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
