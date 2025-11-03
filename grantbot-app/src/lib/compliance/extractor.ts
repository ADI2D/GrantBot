/**
 * Compliance Requirement Extractor
 *
 * Extracts structured compliance requirements from grant opportunity text
 * using rule-based pattern matching and natural language processing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ComplianceRequirement = {
  requirementText: string;
  requirementType: "eligibility" | "document" | "narrative" | "operational" | "deadline" | "other";
  riskLevel: "high" | "medium" | "low";
  deadline?: string;
  autoExtracted: boolean;
  confidenceScore: number;
  suggestedAction?: string;
};

export type ComplianceRule = {
  id: string;
  ruleName: string;
  ruleDescription: string | null;
  keywords: string[];
  requirementType: "eligibility" | "document" | "narrative" | "operational" | "deadline" | "other";
  riskLevel: "high" | "medium" | "low";
  suggestedAction: string | null;
  matchPattern: string | null;
  active: boolean;
};

export type ExtractionResult = {
  requirements: ComplianceRequirement[];
  totalFound: number;
  ruleMatches: { [ruleName: string]: number };
};

export class ComplianceExtractor {
  private client: SupabaseClient;
  private rules: ComplianceRule[] = [];

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Load compliance rules from database
   */
  async loadRules(): Promise<void> {
    const { data, error } = await this.client
      .from("compliance_rules")
      .select("*")
      .eq("active", true);

    if (error) {
      console.error("Failed to load compliance rules:", error);
      throw new Error("Failed to load compliance rules");
    }

    this.rules = (data || []).map((rule) => ({
      id: rule.id,
      ruleName: rule.rule_name,
      ruleDescription: rule.rule_description,
      keywords: rule.keywords || [],
      requirementType: rule.requirement_type,
      riskLevel: rule.risk_level,
      suggestedAction: rule.suggested_action,
      matchPattern: rule.match_pattern,
      active: rule.active,
    }));
  }

  /**
   * Extract compliance requirements from opportunity text
   */
  async extractRequirements(opportunityText: string, complianceNotes?: string): Promise<ExtractionResult> {
    if (this.rules.length === 0) {
      await this.loadRules();
    }

    // Combine all available text
    const fullText = [opportunityText, complianceNotes].filter(Boolean).join("\n\n");
    const normalizedText = this.normalizeText(fullText);

    const requirements: ComplianceRequirement[] = [];
    const ruleMatches: { [ruleName: string]: number } = {};

    // Apply each rule to the text
    for (const rule of this.rules) {
      const matches = this.applyRule(rule, normalizedText, fullText);
      if (matches.length > 0) {
        requirements.push(...matches);
        ruleMatches[rule.ruleName] = matches.length;
      }
    }

    // Extract deadline requirements
    const deadlineRequirements = this.extractDeadlines(fullText);
    requirements.push(...deadlineRequirements);

    // Remove duplicates and merge similar requirements
    const dedupedRequirements = this.deduplicateRequirements(requirements);

    return {
      requirements: dedupedRequirements,
      totalFound: dedupedRequirements.length,
      ruleMatches,
    };
  }

  /**
   * Normalize text for consistent matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s()-]/g, "")
      .trim();
  }

  /**
   * Apply a single rule to text
   */
  private applyRule(rule: ComplianceRule, normalizedText: string, originalText: string): ComplianceRequirement[] {
    const matches: ComplianceRequirement[] = [];

    // Check if any keyword matches
    const matchedKeywords = rule.keywords.filter((keyword) =>
      normalizedText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length === 0) {
      return matches;
    }

    // Calculate confidence based on keyword matches
    const confidence = Math.min(matchedKeywords.length / rule.keywords.length, 1.0);

    // If match pattern exists, validate with regex
    if (rule.matchPattern) {
      try {
        const regex = new RegExp(rule.matchPattern, "i");
        if (!regex.test(originalText)) {
          return matches; // Pattern didn't match
        }
      } catch (e) {
        console.warn(`Invalid regex pattern for rule ${rule.ruleName}:`, e);
      }
    }

    // Extract relevant sentence/context around the match
    const requirementText = this.extractContextAroundKeywords(originalText, matchedKeywords);

    matches.push({
      requirementText: requirementText || rule.ruleDescription || `${rule.ruleName} detected`,
      requirementType: rule.requirementType,
      riskLevel: rule.riskLevel,
      autoExtracted: true,
      confidenceScore: confidence,
      suggestedAction: rule.suggestedAction || undefined,
    });

    return matches;
  }

  /**
   * Extract context (sentence) around matched keywords
   */
  private extractContextAroundKeywords(text: string, keywords: string[]): string | null {
    // Split into sentences (naive approach)
    const sentences = text.split(/[.!?]\s+/);

    for (const keyword of keywords) {
      const matchingSentence = sentences.find((sentence) =>
        sentence.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchingSentence) {
        // Clean up and return sentence
        return matchingSentence.trim().substring(0, 200);
      }
    }

    return null;
  }

  /**
   * Extract deadline-related requirements
   */
  private extractDeadlines(text: string): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];

    // Common deadline patterns
    const deadlinePatterns = [
      /application\s+(?:must\s+be\s+)?(?:submitted|received)\s+by\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
      /deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
      /due\s+(?:date|by)[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
      /submit\s+(?:by|before)[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
    ];

    for (const pattern of deadlinePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const dateStr = match[1];
        requirements.push({
          requirementText: `Application deadline: ${dateStr}`,
          requirementType: "deadline",
          riskLevel: "high",
          autoExtracted: true,
          confidenceScore: 0.9,
          deadline: this.parseDate(dateStr),
          suggestedAction: "Mark calendar and plan submission timeline",
        });
      }
    }

    // Document deadline patterns (e.g., "letters of support due 2 weeks before")
    const relativeDeadlinePattern = /([A-Za-z\s]+)\s+(?:must\s+be\s+)?(?:submitted|due|required)\s+(\d+)\s+(days?|weeks?)\s+before/gi;
    let match;
    while ((match = relativeDeadlinePattern.exec(text)) !== null) {
      const [_, documentType, amount, unit] = match;
      requirements.push({
        requirementText: `${documentType.trim()} due ${amount} ${unit} before application deadline`,
        requirementType: "deadline",
        riskLevel: "medium",
        autoExtracted: true,
        confidenceScore: 0.8,
        suggestedAction: `Secure ${documentType.trim()} in advance of submission`,
      });
    }

    return requirements;
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: string): string | undefined {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return undefined;
      }
      return date.toISOString().split("T")[0];
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Remove duplicate requirements and merge similar ones
   */
  private deduplicateRequirements(requirements: ComplianceRequirement[]): ComplianceRequirement[] {
    const seen = new Map<string, ComplianceRequirement>();

    for (const req of requirements) {
      // Create a key based on type and first 50 chars of text
      const key = `${req.requirementType}:${req.requirementText.substring(0, 50).toLowerCase()}`;

      const existing = seen.get(key);
      if (existing) {
        // Keep the one with higher confidence
        if (req.confidenceScore > existing.confidenceScore) {
          seen.set(key, req);
        }
      } else {
        seen.set(key, req);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Store extracted requirements in database
   */
  async storeRequirements(opportunityId: string, requirements: ComplianceRequirement[]): Promise<void> {
    // Delete existing auto-extracted requirements for this opportunity
    await this.client
      .from("compliance_requirements")
      .delete()
      .eq("opportunity_id", opportunityId)
      .eq("auto_extracted", true);

    if (requirements.length === 0) {
      return;
    }

    // Insert new requirements
    const records = requirements.map((req) => ({
      opportunity_id: opportunityId,
      requirement_text: req.requirementText,
      requirement_type: req.requirementType,
      risk_level: req.riskLevel,
      deadline: req.deadline || null,
      auto_extracted: req.autoExtracted,
      confidence_score: req.confidenceScore,
      suggested_action: req.suggestedAction || null,
    }));

    const { error } = await this.client.from("compliance_requirements").insert(records);

    if (error) {
      console.error("Failed to store compliance requirements:", error);
      throw new Error("Failed to store compliance requirements");
    }

    // Update opportunity to mark extraction complete
    await this.client
      .from("opportunities")
      .update({
        compliance_extracted: true,
        compliance_extracted_at: new Date().toISOString(),
      })
      .eq("id", opportunityId);
  }

  /**
   * Get stored requirements for an opportunity
   */
  async getRequirements(opportunityId: string): Promise<ComplianceRequirement[]> {
    const { data, error } = await this.client
      .from("compliance_requirements")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("risk_level", { ascending: false }) // High risk first
      .order("requirement_type");

    if (error) {
      console.error("Failed to fetch compliance requirements:", error);
      throw new Error("Failed to fetch compliance requirements");
    }

    return (data || []).map((record) => ({
      requirementText: record.requirement_text,
      requirementType: record.requirement_type,
      riskLevel: record.risk_level,
      deadline: record.deadline || undefined,
      autoExtracted: record.auto_extracted,
      confidenceScore: record.confidence_score || 0,
      suggestedAction: record.suggested_action || undefined,
    }));
  }

  /**
   * Get compliance summary for an opportunity
   */
  async getSummary(opportunityId: string): Promise<{
    totalRequirements: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    riskScore: number;
  }> {
    const requirements = await this.getRequirements(opportunityId);

    const highRisk = requirements.filter((r) => r.riskLevel === "high").length;
    const mediumRisk = requirements.filter((r) => r.riskLevel === "medium").length;
    const lowRisk = requirements.filter((r) => r.riskLevel === "low").length;

    // Calculate risk score (0-100)
    const totalRequirements = requirements.length;
    const riskScore =
      totalRequirements > 0
        ? Math.min(((highRisk * 10 + mediumRisk * 5 + lowRisk * 1) * 100) / (totalRequirements * 10), 100)
        : 0;

    return {
      totalRequirements,
      highRisk,
      mediumRisk,
      lowRisk,
      riskScore: Math.round(riskScore),
    };
  }
}
