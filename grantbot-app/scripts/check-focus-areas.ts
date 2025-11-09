/**
 * Diagnostic script to check what focus_area values exist in the database
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkFocusAreas() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all unique focus areas
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("focus_area")
    .order("focus_area");

  if (error) {
    console.error("Error fetching opportunities:", error);
    return;
  }

  // Count occurrences of each focus area
  const focusAreaCounts: Record<string, number> = {};

  opportunities?.forEach((opp) => {
    const focusArea = opp.focus_area || "NULL";
    focusAreaCounts[focusArea] = (focusAreaCounts[focusArea] || 0) + 1;
  });

  console.log("\n=== FOCUS AREA DISTRIBUTION ===");
  console.log(`Total opportunities: ${opportunities?.length || 0}\n`);

  // Sort by count descending
  const sorted = Object.entries(focusAreaCounts).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([focusArea, count]) => {
    console.log(`${focusArea.padEnd(30)} : ${count}`);
  });

  // Sample some opportunities with their focus areas
  const { data: samples } = await supabase
    .from("opportunities")
    .select("name, focus_area, funder_name")
    .limit(10);

  console.log("\n=== SAMPLE OPPORTUNITIES ===");
  samples?.forEach((opp) => {
    console.log(`\nName: ${opp.name}`);
    console.log(`Focus Area: ${opp.focus_area || "NULL"}`);
    console.log(`Funder: ${opp.funder_name}`);
  });
}

checkFocusAreas();
