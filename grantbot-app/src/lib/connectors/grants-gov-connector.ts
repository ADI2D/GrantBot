// ============================================================================
// GRANTS.GOV CONNECTOR
// ============================================================================
// Fetches federal grant opportunities from Grants.gov
// ============================================================================

import { BaseConnector } from "./base-connector";
import type { RawGrant, CanonicalOpportunity } from "@/types/connectors";
import { XMLParser } from "fast-xml-parser";

type RssItem = {
  [key: string]: unknown;
  title?: string;
  description?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  published?: string;
  deadline?: string;
  closeDate?: string;
  "dc:date"?: string;
};

type XmlOpportunity = {
  [key: string]: unknown;
  OpportunityID?: string;
  OpportunityNumber?: string;
  AgencyName?: string;
  AgencyCode?: string;
  OpportunityTitle?: string;
  Description?: string;
  CloseDate?: string;
  PostDate?: string;
  AwardCeiling?: number | string;
  EstimatedTotalProgramFunding?: number | string;
  ArchiveDate?: string;
  CategoryOfFundingActivity?: string | string[];
};

/**
 * Connector for Grants.gov federal opportunities
 *
 * Data source: https://www.grants.gov/xml-extract.html
 * Updates: Daily
 * Coverage: All US federal grant opportunities
 */
export class GrantsGovConnector extends BaseConnector {
  readonly source = "grants_gov";
  readonly name = "Grants.gov (Federal)";

  // Grants.gov data sources:
  // 1. XML Extract (Full Database) - ~2,500 active opportunities, updated daily
  //    ZIP file at: https://www.grants.gov/xml-extract
  //    File format: GrantsDBExtractYYYYMMDDv2.zip (76.3 MB)
  // 2. RSS Feeds (Recent Updates) - Only last 7-30 days of new opportunities
  //    https://www.grants.gov/connect/rss-feeds

  private readonly XML_EXTRACT_PAGE = "https://www.grants.gov/xml-extract";
  private readonly XML_EXTRACT_BASE_URL = "https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/";
  private readonly RSS_FEED_URL = "https://www.grants.gov/web/grants/rss/GG_NewOppByAgency.xml";

  private xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });

  /**
   * Fetch opportunities from Grants.gov
   *
   * Strategy:
   * - Full refresh (no 'since'): Use XML Extract (all ~2,000-4,000 active grants)
   * - Incremental (with 'since'): Use RSS feed (only recent updates)
   * - Mock mode: Use generated test data
   */
  async fetch(since?: Date): Promise<RawGrant[]> {
    console.log(`[${this.source}] Fetching opportunities...`);

    // Use mock data if GRANTS_GOV_USE_MOCK=true in env
    const useMock = process.env.GRANTS_GOV_USE_MOCK === "true";

    try {
      if (useMock) {
        console.log(`[${this.source}] Using mock data (set GRANTS_GOV_USE_MOCK=false for real data)`);
        return this.fetchMockData(since);
      }

      // Full refresh: Use XML Extract to get ALL active opportunities
      if (!since) {
        console.log(`[${this.source}] Full refresh: Fetching XML Extract (all active opportunities)`);
        console.log(`[${this.source}] Page: ${this.XML_EXTRACT_PAGE}`);
        return await this.fetchXMLExtract();
      }

      // Incremental: Use RSS feed for recent updates only
      console.log(`[${this.source}] Incremental sync: Fetching RSS feed (recent updates since ${since.toISOString()})`);
      console.log(`[${this.source}] URL: ${this.RSS_FEED_URL}`);
      return await this.fetchRSSFeed(since);

    } catch (error) {
      console.error(`[${this.source}] Fetch error:`, error);
      // Fallback to mock data if real data fails
      if (!useMock) {
        console.warn(`[${this.source}] Real data fetch failed, falling back to mock data`);
        return this.fetchMockData(since);
      }
      throw error;
    }
  }

  /**
   * Fetch full XML Extract (all active opportunities)
   *
   * The extract is a ZIP file (~76 MB) containing an XML file with ~2,500 opportunities.
   * File format: GrantsDBExtractYYYYMMDDv2.zip
   * Updated daily at ~4:30 AM EDT
   */
  private async fetchXMLExtract(): Promise<RawGrant[]> {
    console.log(`[${this.source}] Fetching XML Extract download page...`);

    // Step 1: Get the download page to find today's ZIP filename
    const pageResponse = await fetch(this.XML_EXTRACT_PAGE, {
      headers: {
        "User-Agent": "GrantBot/1.0 (grant discovery application)",
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch XML Extract page: ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();

    // Step 2: Extract the ZIP filename from the page
    // Look for: GrantsDBExtractYYYYMMDDv2.zip
    const zipFilenameMatch = pageHtml.match(/GrantsDBExtract\d{8}v2\.zip/);

    if (!zipFilenameMatch) {
      console.error(`[${this.source}] Could not find ZIP filename in page`);
      throw new Error("Could not find XML Extract ZIP filename");
    }

    const zipFilename = zipFilenameMatch[0];
    const zipUrl = `${this.XML_EXTRACT_BASE_URL}${zipFilename}`;

    console.log(`[${this.source}] Found ZIP file: ${zipFilename}`);
    console.log(`[${this.source}] Downloading from: ${zipUrl}`);
    console.log(`[${this.source}] This may take 30-60 seconds (~76 MB)...`);

    // Step 3: Download the ZIP file
    const zipResponse = await fetch(zipUrl, {
      headers: {
        "User-Agent": "GrantBot/1.0 (grant discovery application)",
      },
    });

    if (!zipResponse.ok) {
      throw new Error(`Failed to download ZIP: ${zipResponse.status} ${zipResponse.statusText}`);
    }

    const zipBuffer = await zipResponse.arrayBuffer();
    console.log(`[${this.source}] ZIP downloaded (${(zipBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);

    // Step 4: Extract XML from ZIP
    console.log(`[${this.source}] Extracting XML from ZIP...`);
    const xmlContent = await this.extractXMLFromZip(Buffer.from(zipBuffer));

    console.log(`[${this.source}] XML extracted (${(xmlContent.length / 1024 / 1024).toFixed(2)} MB)`);

    // Step 5: Parse the XML
    return this.parseXMLExtract(xmlContent);
  }

  /**
   * Extract XML file from ZIP buffer
   * The ZIP contains a single XML file: GrantsDBExtractYYYYMMDD.xml
   */
  private async extractXMLFromZip(zipBuffer: Buffer): Promise<string> {
    // Use adm-zip library (need to install: npm install adm-zip)
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    // Find the XML file (should be GrantsDBExtractYYYYMMDD.xml)
    const xmlEntry = zipEntries.find((entry) => entry.entryName.endsWith(".xml"));

    if (!xmlEntry) {
      throw new Error("No XML file found in ZIP archive");
    }

    console.log(`[${this.source}] Found XML file: ${xmlEntry.entryName}`);
    return xmlEntry.getData().toString("utf8");
  }

  /**
   * Fetch from RSS feed (recent updates only)
   */
  private async fetchRSSFeed(since?: Date): Promise<RawGrant[]> {
    const response = await fetch(this.RSS_FEED_URL, {
      headers: {
        "User-Agent": "GrantBot/1.0 (grant discovery application)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }

    const xmlContent = await response.text();
    return this.parseRSSFeed(xmlContent, since);
  }

  /**
   * Fetch mock data for testing
   */
  private fetchMockData(since?: Date): RawGrant[] {
    const mockOpportunities = this.generateMockOpportunities();

    // Filter by date if 'since' is provided
    if (since) {
      return mockOpportunities.filter((opp) => {
        const pubDate = this.parseDate(opp.pubDate);
        return pubDate && pubDate > since;
      });
    }

    console.log(`[${this.source}] Generated ${mockOpportunities.length} mock opportunities`);
    return mockOpportunities;
  }

  /**
   * Generate mock grant opportunities for testing
   * This simulates what we'd get from Grants.gov API
   */
  private generateMockOpportunities(): RawGrant[] {
    const agencies = [
      "Department of Education",
      "Department of Health and Human Services",
      "National Science Foundation",
      "National Endowment for the Arts",
      "Department of Energy",
      "Environmental Protection Agency",
    ];

    const programs = [
      { name: "Community Development Block Grant", focus: "Community Development", amount: 500000 },
      { name: "Education Innovation Research", focus: "Education", amount: 250000 },
      { name: "Public Health Emergency Preparedness", focus: "Health & Wellness", amount: 750000 },
      { name: "Arts in Education", focus: "Arts & Culture", amount: 100000 },
      { name: "Clean Energy Research", focus: "Environment", amount: 1000000 },
      { name: "STEM Education Partnership", focus: "Education", amount: 300000 },
      { name: "Rural Health Network Development", focus: "Health & Wellness", amount: 400000 },
      { name: "Climate Resilience Planning", focus: "Environment", amount: 200000 },
    ];

    const opportunities: RawGrant[] = [];
    const now = new Date();

    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const agency = agencies[i % agencies.length];
      const oppId = 300000 + i;
      const pubDate = new Date(now);
      pubDate.setDate(now.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days

      const deadline = new Date(now);
      deadline.setDate(now.getDate() + 30 + Math.floor(Math.random() * 60)); // 30-90 days from now

      opportunities.push({
        title: `${agency} - ${program.name}`,
        link: `https://www.grants.gov/search-results-detail/${oppId}`,
        description: `Federal grant opportunity for ${program.name.toLowerCase()} projects. This program supports innovative approaches to ${program.focus.toLowerCase()} initiatives.`,
        pubDate: pubDate.toISOString(),
        guid: oppId.toString(),
        agency: agency,
        programName: program.name,
        focusArea: program.focus,
        estimatedAward: program.amount,
        deadline: deadline.toISOString(),
      });
    }

    return opportunities;
  }

  /**
   * Parse RSS feed and extract opportunities
   */
  private parseRSSFeed(xmlContent: string, since?: Date): RawGrant[] {
    try {
      const parsed = this.xmlParser.parse(xmlContent);

      // Debug: log the structure we received
      console.log(`[${this.source}] Parsed XML root keys:`, Object.keys(parsed));

      // Try different RSS/Atom structures
      let items: RssItem[] = [];

      // Standard RSS 2.0: rss > channel > item
      if (parsed.rss?.channel?.item) {
        const rawItems = Array.isArray(parsed.rss.channel.item)
          ? parsed.rss.channel.item
          : [parsed.rss.channel.item];
        items = rawItems as RssItem[];
        console.log(`[${this.source}] Found ${items.length} items in RSS 2.0 format`);
      }
      // Atom feed: feed > entry
      else if (parsed.feed?.entry) {
        const rawItems = Array.isArray(parsed.feed.entry)
          ? parsed.feed.entry
          : [parsed.feed.entry];
        items = rawItems as RssItem[];
        console.log(`[${this.source}] Found ${items.length} items in Atom format`);
      }
      // RSS 1.0: RDF > item
      else if (parsed.RDF?.item) {
        const rawItems = Array.isArray(parsed.RDF.item)
          ? parsed.RDF.item
          : [parsed.RDF.item];
        items = rawItems as RssItem[];
        console.log(`[${this.source}] Found ${items.length} items in RDF format`);
      }
      // Direct items array
      else if (parsed.item) {
        const rawItems = Array.isArray(parsed.item) ? parsed.item : [parsed.item];
        items = rawItems as RssItem[];
        console.log(`[${this.source}] Found ${items.length} direct items`);
      }
      else {
        // If we got HTML instead of RSS/XML, throw an error
        if (parsed.html) {
          throw new Error("Received HTML page instead of RSS feed (feed URL may be incorrect)");
        }
        console.warn(`[${this.source}] Unrecognized XML structure`);
        console.warn(`[${this.source}] Sample:`, JSON.stringify(parsed).substring(0, 500));
        throw new Error("Could not parse RSS feed structure");
      }

      if (items.length === 0) {
        console.warn(`[${this.source}] No items found in feed`);
        throw new Error("RSS feed contains no items");
      }

      console.log(`[${this.source}] Sample item keys:`, Object.keys(items[0]));

      // Filter items to only active opportunities
      const now = new Date();
      const activeItems = items.filter((item) => {
        // Filter by date if 'since' is provided
        if (since) {
          const pubDate = this.parseDate(item.pubDate || item.published || item["dc:date"]);
          if (!pubDate || pubDate <= since) {
            return false;
          }
        }

        // Check if opportunity has a deadline and it's in the future
        const deadline = this.parseDate(item.deadline || item.closeDate);
        if (!deadline || deadline < now) {
          return false; // No deadline or deadline has passed
        }

        return true;
      });

      console.log(`[${this.source}] Filtered to ${activeItems.length} active items (${items.length - activeItems.length} filtered out)`);
      return activeItems;
    } catch (error) {
      console.error(`[${this.source}] RSS parse error:`, error);
      throw error;
    }
  }

  /**
   * Parse XML Extract (full database export)
   *
   * The XML Extract has a different structure than the RSS feed:
   * <Grants>
   *   <OpportunitySynopsisDetail_1_0>
   *     <OpportunityID>123456</OpportunityID>
   *     <OpportunityTitle>Grant Title</OpportunityTitle>
   *     <OpportunityNumber>ABC-2024-001</OpportunityNumber>
   *     <AgencyCode>HHS</AgencyCode>
   *     <AgencyName>Department of Health and Human Services</AgencyName>
   *     <Description>Grant description...</Description>
   *     <CloseDate>10312025</CloseDate>
   *     <PostDate>09152025</PostDate>
   *     <AwardCeiling>500000</AwardCeiling>
   *     <AwardFloor>100000</AwardFloor>
   *     ...more fields...
   *   </OpportunitySynopsisDetail_1_0>
   *   ...more opportunities...
   * </Grants>
   */
  private parseXMLExtract(xmlContent: string): RawGrant[] {
    try {
      const parsed = this.xmlParser.parse(xmlContent);

      console.log(`[${this.source}] Parsed XML Extract root keys:`, Object.keys(parsed));

      // The XML Extract structure is: Grants > OpportunitySynopsisDetail_1_0
      let opportunities: XmlOpportunity[] = [];

      if (parsed.Grants?.OpportunitySynopsisDetail_1_0) {
        const details = parsed.Grants.OpportunitySynopsisDetail_1_0;
        const rawOpportunities = Array.isArray(details) ? details : [details];
        opportunities = rawOpportunities as XmlOpportunity[];
        console.log(`[${this.source}] Found ${opportunities.length} opportunities in XML Extract`);
      } else {
        console.warn(`[${this.source}] Unexpected XML Extract structure`);
        console.warn(`[${this.source}] Sample:`, JSON.stringify(parsed).substring(0, 500));
        throw new Error("Could not parse XML Extract structure");
      }

      if (opportunities.length === 0) {
        console.warn(`[${this.source}] No opportunities found in XML Extract`);
        return [];
      }

      console.log(`[${this.source}] Sample opportunity keys:`, Object.keys(opportunities[0]));

      // Filter to only ACTIVE opportunities (not archived, with future deadlines)
      const now = new Date();
      const activeOpportunities = opportunities.filter((opp) => {
        // Skip if already archived
        if (opp.ArchiveDate) {
          const archiveDate = this.parseGrantsGovDate(opp.ArchiveDate);
          if (archiveDate && archiveDate < now) {
            return false; // Archived in the past
          }
        }

        // Skip if no deadline (suspicious - grants always have deadlines)
        if (!opp.CloseDate) {
          return false; // No deadline - skip to avoid confusion
        }

        // Skip if deadline has passed
        const closeDate = this.parseGrantsGovDate(opp.CloseDate);
        if (!closeDate || closeDate < now) {
          return false; // Deadline passed or invalid
        }

        return true; // Active opportunity with future deadline
      });

      console.log(`[${this.source}] Filtered to ${activeOpportunities.length} active opportunities (${opportunities.length - activeOpportunities.length} archived/closed)`);

      // Convert XML Extract format to RawGrant format
      return activeOpportunities.map((opp) => {
        const oppId = opp.OpportunityID || opp.OpportunityNumber;
        const closeDate = this.parseGrantsGovDate(opp.CloseDate);
        const postDate = this.parseGrantsGovDate(opp.PostDate);

        return {
          title: `${opp.AgencyName || opp.AgencyCode} - ${opp.OpportunityTitle}`,
          link: `https://www.grants.gov/search-results-detail/${oppId}`,
          description: this.cleanText(opp.Description) || "",
          pubDate: postDate?.toISOString() || new Date().toISOString(),
          guid: String(oppId),
          agency: opp.AgencyName || opp.AgencyCode,
          programName: opp.OpportunityTitle,
          focusArea: opp.CategoryOfFundingActivity,
          estimatedAward: opp.AwardCeiling || opp.EstimatedTotalProgramFunding,
          deadline: closeDate?.toISOString(),
        } as RawGrant;
      });

    } catch (error) {
      console.error(`[${this.source}] XML Extract parse error:`, error);
      throw error;
    }
  }

  /**
   * Parse Grants.gov date format (MMDDYYYY)
   * Example: "10312025" -> October 31, 2025
   */
  private parseGrantsGovDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr || typeof dateStr !== 'string') return undefined;

    // Remove any non-numeric characters
    const cleaned = dateStr.replace(/\D/g, '');

    if (cleaned.length !== 8) return undefined;

    const month = parseInt(cleaned.substring(0, 2), 10);
    const day = parseInt(cleaned.substring(2, 4), 10);
    const year = parseInt(cleaned.substring(4, 8), 10);

    // Validate
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
      return undefined;
    }

    return new Date(year, month - 1, day);
  }

  /**
   * Normalize grant data to canonical schema
   */
  normalize(raw: RawGrant): CanonicalOpportunity {
    const title = (raw.title as string) || "";
    const link = (raw.link || raw.guid) as string;
    const description = (raw.description as string) || "";
    const pubDate = raw.pubDate as string;

    // Extract opportunity ID from link or GUID
    // Support both old and new URL formats:
    // Old: https://www.grants.gov/web/grants/view-opportunity.html?oppId=312633
    // New: https://www.grants.gov/search-results-detail/312633
    let opportunityID: string;
    const oldFormatMatch = String(link).match(/oppId=(\d+)/);
    const newFormatMatch = String(link).match(/search-results-detail\/(\d+)/);

    if (oldFormatMatch) {
      opportunityID = oldFormatMatch[1];
    } else if (newFormatMatch) {
      opportunityID = newFormatMatch[1];
    } else {
      opportunityID = (raw.guid as string) || `gen_${Date.now()}`;
    }

    // Always use the new URL format
    const applicationUrl = `https://www.grants.gov/search-results-detail/${opportunityID}`;

    // Parse title: "Agency Name - Grant Title"
    const titleParts = String(title).split(" - ");
    const agencyName = titleParts.length > 1 ? titleParts[0] : (raw.agency as string);
    const grantTitle = titleParts.length > 1 ? titleParts.slice(1).join(" - ") : (raw.programName as string) || title;

    // Get focus area - map Grants.gov codes to friendly names
    let focusArea = (raw.focusArea as string) || this.mapTitleToFocusArea(String(grantTitle + " " + description));

    // If focus area looks like a Grants.gov category code, map it to friendly name
    if (focusArea && focusArea.length <= 5) {
      focusArea = this.mapCategoryCodeToFocusArea(focusArea);
    }

    // Get amount and deadline
    const amount = this.parseNumber(raw.estimatedAward as string | number | null);
    const deadline = this.parseDate(raw.deadline as string | null);

    return {
      source: this.source,
      external_id: String(opportunityID),
      name: this.cleanText(grantTitle) || "Untitled Opportunity",
      focus_area: focusArea,
      amount,
      deadline,
      status: this.determineStatus(raw.deadline as string | undefined),
      funder_name: this.cleanText(agencyName),
      eligibility_requirements: undefined,
      application_url: applicationUrl,
      contact_email: undefined,
      geographic_scope: "national",
      compliance_notes: this.cleanText(description)?.substring(0, 500),
      raw_data: raw,
      source_updated_at: this.parseDate(pubDate),
    };
  }

  /**
   * Map title/description to focus area based on keywords
   */
  private mapTitleToFocusArea(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    // Map based on keywords in title/description
    if (lowerText.includes("education") || lowerText.includes("school") || lowerText.includes("student")) {
      return "Education";
    }
    if (lowerText.includes("health") || lowerText.includes("medical") || lowerText.includes("wellness")) {
      return "Health & Wellness";
    }
    if (lowerText.includes("community") || lowerText.includes("housing") || lowerText.includes("development")) {
      return "Community Development";
    }
    if (lowerText.includes("environment") || lowerText.includes("energy") || lowerText.includes("climate")) {
      return "Environment";
    }
    if (lowerText.includes("arts") || lowerText.includes("culture") || lowerText.includes("humanities")) {
      return "Arts & Culture";
    }
    if (lowerText.includes("science") || lowerText.includes("research") || lowerText.includes("innovation")) {
      return "Research & Innovation";
    }
    if (lowerText.includes("disaster") || lowerText.includes("emergency") || lowerText.includes("relief")) {
      return "Disaster Relief";
    }

    return "Other";
  }

  /**
   * Map Grants.gov category codes to friendly category names
   * Grants.gov uses abbreviation codes in CategoryOfFundingActivity field
   */
  private mapCategoryCodeToFocusArea(codes: string | string[]): string {
    // Handle array of codes or JSON array string
    let codeArray: string[] = [];

    if (typeof codes === "string") {
      // Check if it's a JSON array string
      if (codes.startsWith("[") && codes.endsWith("]")) {
        try {
          codeArray = JSON.parse(codes);
        } catch {
          codeArray = [codes];
        }
      } else {
        codeArray = [codes];
      }
    } else if (Array.isArray(codes)) {
      codeArray = codes;
    }

    // Check each code and return the first matching category
    for (const code of codeArray) {
      const upperCode = code.toUpperCase();

      // Health & Wellness
      if (["HL", "FN"].includes(upperCode)) {
        return "Health & Wellness";
      }

      // Education
      if (["ED", "ELT"].includes(upperCode)) {
        return "Education";
      }

      // Environment
      if (["ENV", "EN", "AG"].includes(upperCode)) {
        return "Environment";
      }

      // Research & Innovation
      if (["NR", "ST", "IS"].includes(upperCode)) {
        return "Research & Innovation";
      }

      // Arts & Culture
      if (["AR", "HU"].includes(upperCode)) {
        return "Arts & Culture";
      }

      // Community Development
      if (["CD", "HO", "RD"].includes(upperCode)) {
        return "Community Development";
      }

      // Disaster Relief
      if (["DPR"].includes(upperCode)) {
        return "Disaster Relief";
      }

      // Law & Justice (categorize as Other)
      if (["LJL", "ISS"].includes(upperCode)) {
        return "Other";
      }
    }

    return "Other";
  }

  /**
   * Map Grants.gov category/CFDA to our focus areas (for future use with full API)
   */
  private mapCategoryToFocusArea(category?: string, cfda?: string): string | undefined {
    const categoryStr = (category || "").toLowerCase();
    const cfdaStr = (cfda || "").toLowerCase();

    // Map based on keywords
    if (categoryStr.includes("education") || cfdaStr.includes("84.")) return "Education";
    if (categoryStr.includes("health") || cfdaStr.includes("93.")) return "Health & Wellness";
    if (categoryStr.includes("community") || categoryStr.includes("housing")) return "Community Development";
    if (categoryStr.includes("environment") || categoryStr.includes("energy")) return "Environment";
    if (categoryStr.includes("arts") || categoryStr.includes("humanities")) return "Arts & Culture";
    if (categoryStr.includes("science") || categoryStr.includes("research")) return "Research & Innovation";
    if (categoryStr.includes("disaster") || categoryStr.includes("emergency")) return "Disaster Relief";

    return "Other";
  }

  /**
   * Determine opportunity status based on deadline
   */
  private determineStatus(closeDate?: string): string {
    const deadline = this.parseDate(closeDate);
    if (!deadline) return "open";

    const now = new Date();
    const daysUntilClose = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilClose < 0) return "closed";
    if (daysUntilClose <= 7) return "closing_soon";
    return "open";
  }

  /**
   * Get formatted date string YYYYMMDD for Grants.gov file naming
   */
  private getYYYYMMDD(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  /**
   * Health check: verify we can reach Grants.gov
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.XML_FEED_URL, {
        method: "HEAD",
        headers: {
          "User-Agent": "GrantBot/1.0 (grant discovery application)",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
