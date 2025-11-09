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
  // Get counts by source using group by
  const { data, error } = await supabase.rpc("count_by_source");

  if (error) {
    console.log("RPC not available, using alternative method");

    // Alternative: Get sample and aggregate
    const { data: allData } = await supabase.from("opportunities").select("source, id");

    if (allData) {
      const counts: Record<string, number> = {};
      allData.forEach((row) => {
        counts[row.source] = (counts[row.source] || 0) + 1;
      });

      console.log("Total opportunities:", allData.length);
      console.log("\nBreakdown by source:");
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          console.log(`  ${source}: ${count.toLocaleString()}`);
        });
    }
  } else {
    console.log("Counts by source:", data);
  }
}

checkCounts().catch(console.error);
