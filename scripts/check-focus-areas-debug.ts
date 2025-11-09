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
  const { data: sample } = await supabase
    .from("opportunities")
    .select("id, name, source, focus_area, focus_areas")
    .limit(20);

  console.log("Sample opportunities:");
  sample?.forEach((opp) => {
    console.log(`\nSource: ${opp.source}`);
    console.log(`Name: ${opp.name.substring(0, 60)}...`);
    console.log(`focus_area: ${opp.focus_area}`);
    console.log(`focus_areas: ${JSON.stringify(opp.focus_areas)}`);
  });

  const { count: healthCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("focus_area", "health");

  console.log(`\n\nCount with focus_area = 'health': ${healthCount}`);

  const { count: healthArrayCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .contains("focus_areas", ["health"]);

  console.log(`Count with 'health' in focus_areas array: ${healthArrayCount}`);

  const { data: uniqueFocusAreas } = await supabase
    .from("opportunities")
    .select("focus_area")
    .limit(1000);

  if (uniqueFocusAreas) {
    const unique = new Set(uniqueFocusAreas.map((r) => r.focus_area));
    console.log(`\nUnique focus_area values (sample):`);
    Array.from(unique).sort().forEach((fa) => console.log(`  - ${fa}`));
  }
}

main();
