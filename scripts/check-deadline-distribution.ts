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
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];
  
  console.log("Deadline Distribution");
  console.log("=".repeat(80));
  console.log(`Today: ${new Date().toISOString().split("T")[0]}`);
  console.log(`60 days ago: ${sixtyDaysAgoStr}`);
  console.log();
  
  const { count: total } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });
  
  const { count: withDeadline } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .not("deadline", "is", null);
    
  const { count: recentDeadline } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .gte("deadline", sixtyDaysAgoStr);
    
  const { count: futureDeadline } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .gte("deadline", new Date().toISOString().split("T")[0]);
  
  console.log(`Total opportunities:           ${total?.toLocaleString()}`);
  console.log(`With deadline:                 ${withDeadline?.toLocaleString()} (${((withDeadline||0)/(total||1)*100).toFixed(1)}%)`);
  console.log(`Recent deadline (60+ days):    ${recentDeadline?.toLocaleString()} (${((recentDeadline||0)/(total||1)*100).toFixed(1)}%)`);
  console.log(`Future deadline (open):        ${futureDeadline?.toLocaleString()} (${((futureDeadline||0)/(total||1)*100).toFixed(1)}%)`);
  console.log();
  console.log(`SAM.gov programs (no deadline): ${(total || 0) - (withDeadline || 0)} opportunities`);
}

main();
