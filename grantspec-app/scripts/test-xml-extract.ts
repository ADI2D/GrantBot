#!/usr/bin/env tsx
// Quick test to verify XML Extract is accessible and parse-able

async function testXMLExtract() {
  const URL = "https://www.grants.gov/extract/GrantsDBExtract.xml";

  console.log("Testing Grants.gov XML Extract...");
  console.log(`URL: ${URL}`);
  console.log("");

  try {
    console.log("Fetching...");
    const startTime = Date.now();

    const response = await fetch(URL, {
      headers: {
        "User-Agent": "GrantSpec/1.0 (grant discovery application)",
      },
    });

    const fetchTime = Date.now() - startTime;
    console.log(`✅ Fetch completed in ${(fetchTime / 1000).toFixed(2)}s`);
    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ Failed: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const xmlContent = await response.text();
    const downloadTime = Date.now() - startTime;

    console.log(`✅ Download completed in ${(downloadTime / 1000).toFixed(2)}s`);
    console.log(`   Size: ${(xmlContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log("");

    // Try to parse
    console.log("Parsing XML...");
    const { XMLParser } = await import("fast-xml-parser");
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
    });

    const parseStartTime = Date.now();
    const parsed = parser.parse(xmlContent);
    const parseTime = Date.now() - parseStartTime;

    console.log(`✅ Parse completed in ${(parseTime / 1000).toFixed(2)}s`);
    console.log(`   Root keys: ${Object.keys(parsed).join(", ")}`);

    if (parsed.Grants?.OpportunitySynopsisDetail_1_0) {
      const details = parsed.Grants.OpportunitySynopsisDetail_1_0;
      const count = Array.isArray(details) ? details.length : 1;

      console.log(`✅ Found ${count} opportunities`);

      if (count > 0) {
        const first = Array.isArray(details) ? details[0] : details;
        console.log("");
        console.log("Sample opportunity:");
        console.log(`   ID: ${first.OpportunityID}`);
        console.log(`   Title: ${first.OpportunityTitle}`);
        console.log(`   Agency: ${first.AgencyName}`);
        console.log(`   Close Date: ${first.CloseDate}`);
      }
    } else {
      console.error("❌ Unexpected XML structure");
      console.error(`   Got: ${JSON.stringify(parsed).substring(0, 200)}...`);
    }

    console.log("");
    console.log("=".repeat(80));
    console.log(`✅ TEST PASSED - ${downloadTime + parseTime}ms total`);
    console.log("=".repeat(80));

  } catch (error) {
    console.error("");
    console.error("❌ TEST FAILED");
    console.error(error);
    process.exit(1);
  }
}

testXMLExtract();
