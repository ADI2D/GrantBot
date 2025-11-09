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

async function main() {
  const { count: grantsGov } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("source", "grants_gov");
  const { count: usaspending } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("source", "usaspending");
  const { count: samGov } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("source", "sam_gov");
  const { count: total } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  console.log("Opportunity counts by source:");
  console.log("  grants_gov:   ", grantsGov?.toLocaleString() || 0);
  console.log("  usaspending:  ", usaspending?.toLocaleString() || 0);
  console.log("  sam_gov:      ", samGov?.toLocaleString() || 0);
  console.log("  ----------------");
  console.log("  TOTAL:        ", total?.toLocaleString() || 0);
}

main();
