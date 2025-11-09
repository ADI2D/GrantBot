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
  console.log("SAM.gov Assistance Listings - Focus Area Distribution");
  console.log("=".repeat(80));
  
  const focusAreas = [
    'health',
    'education', 
    'arts-culture',
    'environment',
    'human-services',
    'youth-development',
    'community-development',
    'research-science',
    'international',
    'other'
  ];
  
  const { count: total } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("source", "sam_gov");
  
  console.log(`Total SAM.gov programs: ${total?.toLocaleString()}\n`);
  
  for (const fa of focusAreas) {
    const { count } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("source", "sam_gov")
      .eq("focus_area", fa);
    
    const percentage = total ? ((count || 0) / total * 100).toFixed(1) : 0;
    if (count && count > 0) {
      console.log(`${fa.padEnd(25)} ${(count || 0).toLocaleString().padStart(6)} (${percentage}%)`);
    }
  }
}

main();
