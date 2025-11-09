#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function checkCounts() {
  // Get total count
  const { count: total } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  console.log("Total opportunities:", total);

  // Get counts by source
  const { data: sources } = await supabase.from("opportunities").select("source").order("source");

  if (sources) {
    const counts = sources.reduce((acc: Record<string, number>, row) => {
      acc[row.source] = (acc[row.source] || 0) + 1;
      return acc;
    }, {});

    console.log("\nBreakdown by source:");
    Object.entries(counts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
  }
}

checkCounts().catch(console.error);
