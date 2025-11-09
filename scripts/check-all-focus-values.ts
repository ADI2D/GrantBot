#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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
  const { data } = await supabase.from('opportunities').select('focus_area');
  if (!data) return;
  
  const counts: Record<string, number> = {};
  data.forEach((r) => {
    counts[r.focus_area] = (counts[r.focus_area] || 0) + 1;
  });
  
  console.log('All focus_area values with counts:');
  console.log('='.repeat(80));
  Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([fa, count]) => {
    console.log(`  ${String(fa).padEnd(30)} ${String(count).padStart(8)}`);
  });
}

main();
