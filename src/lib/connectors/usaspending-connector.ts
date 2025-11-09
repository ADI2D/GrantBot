import { BaseConnector } from "./base-connector";
import { CanonicalOpportunity, RawGrant } from "@/types/connectors";

/**
 * USAspending.gov Connector
 *
 * Integrates with USAspending.gov API to fetch:
 * - Federal financial assistance awards
 * - Historical spending data
 * - Award recipients and amounts
 * - Agency-specific grants
 *
 * API Documentation: https://api.usaspending.gov/
 */
export class USASpendingConnector extends BaseConnector {
  readonly source = "usaspending";
  readonly name = "USAspending.gov";
  private readonly baseUrl = "https://api.usaspending.gov/api/v2";

  /**
   * Fetch opportunities from USAspending.gov API
   *
   * Queries the financial_assistance_awards endpoint for active grants
   */
  async fetch(since?: Date): Promise<RawGrant[]> {
    try {
      console.log(`[${this.source}] Starting fetch from USAspending.gov`);

      // Determine time period based on last sync
      const startDate = since ? this.formatDate(since) : this.getDateMonthsAgo(6);
      const endDate = this.getCurrentDate();

      console.log(`[${this.source}] Fetching awards from ${startDate} to ${endDate}`);

      // Query for recent financial assistance awards
      // Filter for grants (not loans or insurance)
      const response = await fetch(`${this.baseUrl}/search/spending_by_award/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            award_type_codes: ["02", "03", "04", "05"], // Grant types
            time_period: [
              {
                start_date: startDate,
                end_date: endDate,
              },
            ],
          },
          fields: [
            "Award ID",
            "Recipient Name",
            "Award Amount",
            "Description",
            "Start Date",
            "End Date",
            "Awarding Agency",
            "Awarding Sub Agency",
            "Award Type",
            "CFDA Number",
            "CFDA Title",
          ],
          page: 1,
          limit: 100,
          sort: "Award Amount",
          order: "desc",
        }),
      });

      if (!response.ok) {
        throw new Error(`USAspending API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      console.log(`[${this.source}] Fetched ${results.length} awards from USAspending.gov`);

      // Return raw grants for normalization by pipeline
      return results as RawGrant[];
    } catch (error) {
      console.error(`[${this.source}] Failed to fetch from USAspending.gov`, error);
      throw error;
    }
  }

  /**
   * Normalize USAspending award to canonical format
   */
  normalize(rawData: RawGrant): CanonicalOpportunity {
    // Extract key fields from USAspending data structure
    const awardId = rawData["Award ID"] || rawData.generated_unique_award_id;
    const recipientName = rawData["Recipient Name"] || rawData.recipient_name;
    const amount = rawData["Award Amount"] || rawData.total_obligation;
    const description = rawData["Description"] || rawData.description || "";
    const startDate = rawData["Start Date"] || rawData.period_of_performance_start_date;
    const endDate = rawData["End Date"] || rawData.period_of_performance_current_end_date;
    const agency = rawData["Awarding Agency"] || rawData.awarding_agency_name;
    const subAgency = rawData["Awarding Sub Agency"] || rawData.awarding_sub_agency_name;
    const cfdaNumber = rawData["CFDA Number"] || rawData.cfda_number;
    const cfdaTitle = rawData["CFDA Title"] || rawData.cfda_title;

    if (!awardId) {
      throw new Error("Award missing required ID field");
    }

    // Map CFDA categories to focus areas
    const focusAreas = this.mapCFDAToFocusAreas(cfdaNumber, cfdaTitle);

    // Build funder name from agency hierarchy
    const funderName = subAgency || agency || "Federal Government";

    // Construct opportunity name from CFDA title or description
    const name = cfdaTitle || description.substring(0, 100) || `Award ${awardId}`;

    return {
      source: this.source,
      external_id: awardId,
      name,
      description,
      focus_area: focusAreas[0] || "other",
      focus_areas: focusAreas,
      amount: amount ? Number(amount) : null,
      deadline: endDate || null,
      status: this.determineStatus(endDate),
      funder_name: funderName,
      application_url: `https://www.usaspending.gov/award/${awardId}`,
      geographic_scope: "National",
      eligibility_criteria: this.buildEligibilityCriteria(rawData),
      metadata: {
        cfda_number: cfdaNumber,
        cfda_title: cfdaTitle,
        awarding_agency: agency,
        awarding_sub_agency: subAgency,
        start_date: startDate,
        recipient_name: recipientName,
      },
      raw_data: rawData,
    };
  }

  /**
   * Map CFDA (Catalog of Federal Domestic Assistance) codes to focus areas
   *
   * CFDA codes are organized by agency and program type
   * Examples:
   * - 84.xxx = Department of Education
   * - 93.xxx = Health & Human Services
   * - 10.xxx = Department of Agriculture
   */
  private mapCFDAToFocusAreas(cfdaNumber?: string, cfdaTitle?: string): string[] {
    const focusAreas: Set<string> = new Set();

    if (!cfdaNumber && !cfdaTitle) {
      return ["other"];
    }

    // Map by CFDA number prefix (agency)
    if (cfdaNumber) {
      const prefix = cfdaNumber.split(".")[0];

      switch (prefix) {
        case "84": // Department of Education
          focusAreas.add("education");
          break;
        case "93": // Health & Human Services
          focusAreas.add("health");
          break;
        case "10": // Agriculture (often includes nutrition, rural development)
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
      }
    }

    // Map by keywords in CFDA title
    if (cfdaTitle) {
      const title = cfdaTitle.toLowerCase();

      if (title.includes("education") || title.includes("school") || title.includes("student")) {
        focusAreas.add("education");
      }
      if (title.includes("health") || title.includes("medical") || title.includes("hospital")) {
        focusAreas.add("health");
      }
      if (title.includes("arts") || title.includes("culture") || title.includes("museum")) {
        focusAreas.add("arts-culture");
      }
      if (title.includes("environment") || title.includes("conservation") || title.includes("climate")) {
        focusAreas.add("environment");
      }
      if (title.includes("youth") || title.includes("child") || title.includes("adolescent")) {
        focusAreas.add("youth-development");
      }
      if (title.includes("community") || title.includes("housing") || title.includes("economic development")) {
        focusAreas.add("community-development");
      }
      if (title.includes("research") || title.includes("science") || title.includes("technology")) {
        focusAreas.add("research-science");
      }
      if (title.includes("international") || title.includes("global") || title.includes("foreign")) {
        focusAreas.add("international");
      }
      if (title.includes("human services") || title.includes("social services") || title.includes("family")) {
        focusAreas.add("human-services");
      }
    }

    return focusAreas.size > 0 ? Array.from(focusAreas) : ["other"];
  }

  /**
   * Determine opportunity status based on end date
   */
  private determineStatus(endDate?: string): "open" | "closed" | "upcoming" {
    if (!endDate) {
      return "open"; // Assume open if no end date
    }

    const end = new Date(endDate);
    const now = new Date();

    if (end < now) {
      return "closed";
    }

    return "open";
  }

  /**
   * Build eligibility criteria text from award data
   */
  private buildEligibilityCriteria(rawData: any): string {
    const criteria: string[] = [];

    // Add recipient type if available
    if (rawData.recipient_type_name) {
      criteria.push(`Eligible recipient type: ${rawData.recipient_type_name}`);
    }

    // Add place of performance if available
    if (rawData.place_of_performance_city && rawData.place_of_performance_state_code) {
      criteria.push(
        `Location: ${rawData.place_of_performance_city}, ${rawData.place_of_performance_state_code}`
      );
    }

    // Add NAICS code if available (industry classification)
    if (rawData.naics_code) {
      criteria.push(`NAICS code: ${rawData.naics_code}`);
    }

    return criteria.length > 0 ? criteria.join("; ") : "";
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Get date N months ago in YYYY-MM-DD format
   */
  private getDateMonthsAgo(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split("T")[0];
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  private getCurrentDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Health check for USAspending.gov API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/autocomplete/cfda/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_text: "health",
          limit: 1,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logError("USAspending health check failed", error);
      return false;
    }
  }
}
