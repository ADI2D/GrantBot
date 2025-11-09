import { BaseConnector } from "./base-connector";
import { CanonicalOpportunity, RawGrant } from "@/types/connectors";
import Papa from "papaparse";

/**
 * SAM.gov Assistance Listings Connector
 *
 * Integrates with SAM.gov Assistance Listings database (formerly CFDA) to fetch:
 * - Federal assistance program listings (~2,300 programs)
 * - Program descriptions and eligibility criteria
 * - Agency and sub-agency information
 * - Program objectives and uses
 *
 * Data Source: CSV file from data.gov
 * URL: https://s3.amazonaws.com/falextracts/Assistance%20Listings/datagov/AssistanceListings_DataGov_PUBLIC_CURRENT.csv
 */
export class SAMGovConnector extends BaseConnector {
  readonly source = "sam_gov";
  readonly name = "SAM.gov Assistance Listings";
  private readonly csvUrl =
    "https://s3.amazonaws.com/falextracts/Assistance%20Listings/datagov/AssistanceListings_DataGov_PUBLIC_CURRENT.csv";

  /**
   * Fetch assistance listings from SAM.gov CSV export
   *
   * Note: Since this is a full catalog export (not an incremental API),
   * the 'since' parameter is not used. We always fetch the full dataset
   * and let the pipeline handle deduplication.
   */
  async fetch(since?: Date): Promise<RawGrant[]> {
    try {
      console.log(`[${this.source}] Starting fetch from SAM.gov Assistance Listings`);
      console.log(`[${this.source}] Downloading CSV from: ${this.csvUrl}`);

      const response = await fetch(this.csvUrl);

      if (!response.ok) {
        throw new Error(`SAM.gov CSV download error: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();

      // Parse CSV using papaparse
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (parsed.errors.length > 0) {
        console.warn(`[${this.source}] CSV parsing warnings:`, parsed.errors.slice(0, 5));
      }

      const records = parsed.data as Record<string, string>[];
      console.log(`[${this.source}] Parsed ${records.length} assistance listings from CSV`);

      return records as RawGrant[];
    } catch (error) {
      console.error(`[${this.source}] Failed to fetch from SAM.gov`, error);
      throw error;
    }
  }

  /**
   * Normalize SAM.gov assistance listing to canonical format
   */
  normalize(rawData: RawGrant): CanonicalOpportunity {
    // Common field names in SAM.gov CSV
    const programNumber = rawData["Program Number"] || rawData["program_number"];
    const programTitle = rawData["Program Title"] || rawData["program_title"];
    const popularName = rawData["Popular Name (020)"] || rawData["popular_name"];
    const agencyName = rawData["Federal Agency"] || rawData["agency_name"];
    const subAgencyName = rawData["Sub Agency"] || rawData["subagency_name"];
    const programDescription =
      rawData["Program Accomplishments"] ||
      rawData["Objectives (010)"] ||
      rawData["program_description"] ||
      "";
    const usesAndRestrictions =
      rawData["Uses and Use Restrictions (030)"] || rawData["uses_and_restrictions"] || "";
    const eligibility =
      rawData["Applicant Eligibility (081)"] ||
      rawData["Beneficiary Eligibility (082)"] ||
      rawData["eligibility"] ||
      "";
    const webUrl =
      rawData["Program Web Page"] || rawData["program_website"] || rawData["website_address"];

    if (!programNumber) {
      throw new Error("Assistance listing missing required program number");
    }

    // Build comprehensive description
    const descriptionParts = [programDescription, usesAndRestrictions].filter(Boolean);
    const description = descriptionParts.join("\n\n").substring(0, 5000) || programTitle;

    // Map program to focus areas based on program number and title
    const focusAreas = this.mapProgramToFocusAreas(programNumber, programTitle, description);

    // Build funder name from agency hierarchy
    const funderName = subAgencyName || agencyName || "Federal Government";

    // Use popular name if available, otherwise program title
    const name = popularName || programTitle || `Program ${programNumber}`;

    // SAM.gov assistance listings are ongoing programs, not time-limited opportunities
    // We mark them as "open" with no deadline
    const status = "open";

    return {
      source: this.source,
      external_id: programNumber,
      name,
      description,
      focus_area: focusAreas[0] || "other",
      focus_areas: focusAreas,
      amount: null, // Programs don't have fixed amounts
      deadline: undefined, // Ongoing programs have no deadline
      status,
      funder_name: funderName,
      application_url: webUrl || `https://sam.gov/fal/${programNumber}/view`,
      geographic_scope: this.determineGeographicScope(rawData),
      eligibility_criteria: eligibility,
      metadata: {
        program_number: programNumber,
        agency_name: agencyName,
        subagency_name: subAgencyName,
        popular_name: popularName,
        authorization: rawData["Authorization (090)"] || rawData["authorization"],
        assistance_type: rawData["Type of Assistance (070)"] || rawData["assistance_type"],
        cfda_number: programNumber, // SAM.gov program numbers are the same as CFDA numbers
      },
      raw_data: rawData,
    };
  }

  /**
   * Map SAM.gov program number and content to focus areas
   *
   * SAM.gov program numbers follow same format as CFDA codes:
   * - 84.xxx = Department of Education
   * - 93.xxx = Health & Human Services
   * - etc.
   */
  private mapProgramToFocusAreas(
    programNumber?: string,
    title?: string,
    description?: string
  ): string[] {
    const focusAreas: Set<string> = new Set();

    if (!programNumber && !title) {
      return ["other"];
    }

    // Map by program number prefix (agency code)
    if (programNumber) {
      const prefix = programNumber.split(".")[0];

      switch (prefix) {
        case "84": // Department of Education
          focusAreas.add("education");
          break;
        case "93": // Health & Human Services
          focusAreas.add("health");
          break;
        case "10": // Agriculture (nutrition, rural development)
          focusAreas.add("community-development");
          focusAreas.add("environment");
          break;
        case "15": // Interior (conservation, tribal programs)
          focusAreas.add("environment");
          break;
        case "45": // National Endowment for the Arts/Humanities
          focusAreas.add("arts-culture");
          break;
        case "47": // National Science Foundation
          focusAreas.add("research-science");
          break;
        case "59": // Small Business Administration
          focusAreas.add("community-development");
          break;
        case "66": // Environmental Protection Agency
          focusAreas.add("environment");
          break;
        case "94": // AmeriCorps
          focusAreas.add("youth-development");
          break;
        case "19": // State Department (international)
          focusAreas.add("international");
          break;
        case "14": // HUD (housing)
          focusAreas.add("community-development");
          break;
        case "16": // Justice (law enforcement, victims)
          focusAreas.add("human-services");
          break;
        case "17": // Labor (employment, training)
          focusAreas.add("community-development");
          break;
        case "21": // Treasury
          focusAreas.add("community-development");
          break;
        case "64": // Veterans Affairs
          focusAreas.add("health");
          focusAreas.add("human-services");
          break;
      }
    }

    // Map by keywords in title and description
    const searchText = `${title} ${description}`.toLowerCase();

    if (
      searchText.includes("education") ||
      searchText.includes("school") ||
      searchText.includes("student") ||
      searchText.includes("teacher") ||
      searchText.includes("learning")
    ) {
      focusAreas.add("education");
    }

    if (
      searchText.includes("health") ||
      searchText.includes("medical") ||
      searchText.includes("hospital") ||
      searchText.includes("medicaid") ||
      searchText.includes("medicare") ||
      searchText.includes("disease") ||
      searchText.includes("mental health")
    ) {
      focusAreas.add("health");
    }

    if (
      searchText.includes("arts") ||
      searchText.includes("culture") ||
      searchText.includes("museum") ||
      searchText.includes("humanities") ||
      searchText.includes("heritage")
    ) {
      focusAreas.add("arts-culture");
    }

    if (
      searchText.includes("environment") ||
      searchText.includes("conservation") ||
      searchText.includes("climate") ||
      searchText.includes("water quality") ||
      searchText.includes("pollution") ||
      searchText.includes("wildlife") ||
      searchText.includes("ecosystem")
    ) {
      focusAreas.add("environment");
    }

    if (
      searchText.includes("youth") ||
      searchText.includes("child") ||
      searchText.includes("adolescent") ||
      searchText.includes("juvenile")
    ) {
      focusAreas.add("youth-development");
    }

    if (
      searchText.includes("community") ||
      searchText.includes("housing") ||
      searchText.includes("economic development") ||
      searchText.includes("rural development") ||
      searchText.includes("urban") ||
      searchText.includes("infrastructure")
    ) {
      focusAreas.add("community-development");
    }

    if (
      searchText.includes("research") ||
      searchText.includes("science") ||
      searchText.includes("technology") ||
      searchText.includes("innovation") ||
      searchText.includes("stem")
    ) {
      focusAreas.add("research-science");
    }

    if (
      searchText.includes("international") ||
      searchText.includes("global") ||
      searchText.includes("foreign") ||
      searchText.includes("overseas") ||
      searchText.includes("exchange")
    ) {
      focusAreas.add("international");
    }

    if (
      searchText.includes("human services") ||
      searchText.includes("social services") ||
      searchText.includes("family") ||
      searchText.includes("disability") ||
      searchText.includes("aging") ||
      searchText.includes("nutrition") ||
      searchText.includes("food assistance")
    ) {
      focusAreas.add("human-services");
    }

    return focusAreas.size > 0 ? Array.from(focusAreas) : ["other"];
  }

  /**
   * Determine geographic scope from program data
   */
  private determineGeographicScope(rawData: any): string {
    // Most federal assistance programs are national
    // Could be enhanced with state-specific program detection
    return "National";
  }

  /**
   * Health check for SAM.gov CSV availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.csvUrl, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      this.logError("SAM.gov health check failed", error);
      return false;
    }
  }
}
