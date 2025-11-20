import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClientProfile {
  name: string;
  mission?: string;
  focusAreas?: string[];
  typicalAwardSize?: number;
  targetBeneficiaries?: string;
  geographicFocus?: string;
}

export interface GrantOpportunity {
  name: string;
  funderName: string;
  focusArea: string | null;
  amount: number | null;
  deadline: string | null;
  complianceNotes: string | null;
  geographicScope: string | null;
}

export interface MatchResult {
  score: number; // 0-100
  reasoning: string;
  keyAlignments: string[];
  potentialChallenges: string[];
}

/**
 * Calculate match score between a client and a grant opportunity using AI
 */
export async function calculateMatchScore(
  client: ClientProfile,
  grant: GrantOpportunity
): Promise<MatchResult> {
  const prompt = `You are a grant matching expert. Analyze how well this grant opportunity matches the client's profile and provide a match score from 0-100.

CLIENT PROFILE:
- Name: ${client.name}
- Mission: ${client.mission || "Not specified"}
- Focus Areas: ${client.focusAreas?.join(", ") || "Not specified"}
- Typical Award Size: ${client.typicalAwardSize ? `$${client.typicalAwardSize.toLocaleString()}` : "Not specified"}
- Target Beneficiaries: ${client.targetBeneficiaries || "Not specified"}
- Geographic Focus: ${client.geographicFocus || "Not specified"}

GRANT OPPORTUNITY:
- Grant Name: ${grant.name}
- Funder: ${grant.funderName}
- Focus Area: ${grant.focusArea || "Not specified"}
- Award Amount: ${grant.amount ? `$${grant.amount.toLocaleString()}` : "Not specified"}
- Deadline: ${grant.deadline || "Not specified"}
- Geographic Scope: ${grant.geographicScope || "Not specified"}
- Details: ${grant.complianceNotes || "Not specified"}

SCORING CRITERIA:
1. Mission Alignment (40%): How well does the grant's purpose align with the client's mission?
2. Focus Area Match (30%): Does the grant's focus area relate to the client's work?
3. Award Size Fit (15%): Is the award amount appropriate for the client's typical grants?
4. Geographic Match (10%): Does the geographic scope work for the client?
5. Beneficiary Alignment (5%): Do the target beneficiaries align?

IMPORTANT SCORING RULES:
- If there is ANY thematic connection (e.g., both related to education, both serve similar populations), the minimum score should be 20%
- Broad focus areas like "Education" or "Humanities" should match with related subcategories (e.g., "Digital Humanities" should match "Education" at 30-50%)
- Only give 0% if there is absolutely NO connection whatsoever
- Consider institutional type (e.g., universities should match education grants)

Respond in JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<1-2 sentence explanation>",
  "keyAlignments": ["<alignment point 1>", "<alignment point 2>"],
  "potentialChallenges": ["<challenge 1>", "<challenge 2>"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Extract JSON from response (handle cases where Claude wraps it in markdown or text)
    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Look for JSON object in the text
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    const result = JSON.parse(jsonText) as MatchResult;

    // Ensure score is within bounds
    result.score = Math.max(0, Math.min(100, result.score));

    return result;
  } catch (error) {
    console.error("Error calculating match score:", error);

    // Fallback to basic keyword matching if AI fails
    return fallbackMatchScore(client, grant);
  }
}

/**
 * Fallback scoring based on simple keyword matching
 */
function fallbackMatchScore(
  client: ClientProfile,
  grant: GrantOpportunity
): MatchResult {
  let score = 0;
  const keyAlignments: string[] = [];
  const potentialChallenges: string[] = [];

  // Check focus area match
  if (grant.focusArea && client.focusAreas) {
    const grantFocus = grant.focusArea.toLowerCase();
    const clientFocuses = client.focusAreas.map(f => f.toLowerCase());

    // Exact match
    if (clientFocuses.includes(grantFocus)) {
      score += 50;
      keyAlignments.push(`Focus area alignment: ${grant.focusArea}`);
    }
    // Partial match (contains keywords)
    else {
      const keywords = ["education", "humanities", "arts", "science", "technology", "health", "environment"];
      for (const keyword of keywords) {
        if (grantFocus.includes(keyword) && clientFocuses.some(f => f.includes(keyword))) {
          score += 30;
          keyAlignments.push(`Related focus area: ${keyword}`);
          break;
        }
      }
    }
  }

  // Check mission alignment (simple keyword search)
  if (client.mission && grant.complianceNotes) {
    const missionWords = client.mission.toLowerCase().split(/\s+/);
    const grantWords = grant.complianceNotes.toLowerCase().split(/\s+/);
    const commonWords = missionWords.filter(w => w.length > 4 && grantWords.includes(w));

    if (commonWords.length > 3) {
      score += 20;
      keyAlignments.push("Mission keyword alignment");
    }
  }

  // Check award size fit
  if (client.typicalAwardSize && grant.amount) {
    const ratio = grant.amount / client.typicalAwardSize;
    if (ratio >= 0.5 && ratio <= 2) {
      score += 15;
      keyAlignments.push("Appropriate award size");
    } else {
      potentialChallenges.push("Award size may be outside typical range");
    }
  }

  // Ensure minimum score for any education/university match
  if (client.name.toLowerCase().includes("university") &&
      (grant.focusArea?.toLowerCase().includes("education") ||
       grant.focusArea?.toLowerCase().includes("humanities"))) {
    score = Math.max(score, 25);
    if (keyAlignments.length === 0) {
      keyAlignments.push("University institution matches educational grant");
    }
  }

  return {
    score: Math.min(100, score),
    reasoning: score > 0
      ? `Basic alignment detected based on ${keyAlignments.length} matching criteria`
      : "No significant alignment detected",
    keyAlignments,
    potentialChallenges,
  };
}
