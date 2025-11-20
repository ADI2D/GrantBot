# Grant Matching & Scoring System

## Overview

GrantBot uses an AI-powered weighted scoring system to intelligently match grant opportunities with clients/organizations. This system evaluates multiple factors to calculate a **0-100% match score** that represents how well a grant aligns with a client's profile.

## Scoring Criteria

The AI evaluation model considers five weighted factors:

### 1. Mission Alignment (40% weight)
**Purpose:** Evaluates how well the grant's purpose aligns with the client's mission statement.

- Analyzes semantic similarity between grant description and client mission
- Considers shared goals, target outcomes, and programmatic overlap
- Looks for thematic connections in language and objectives

**Example:**
- Client mission: "Supporting education access for underserved communities"
- Grant focus: "Expanding educational opportunities in rural areas"
- Result: High mission alignment (30-40 points)

### 2. Focus Area Match (30% weight)
**Purpose:** Determines if the grant's focus area relates to the client's work areas.

- Exact match on focus area tags (e.g., "Education" → "Education")
- Partial match on related categories (e.g., "Digital Humanities" → "Education")
- Considers institutional type (e.g., universities match educational grants)

**Scoring Rules:**
- Exact focus area match: 25-30 points
- Related subcategory match: 15-20 points
- Broad thematic connection: 5-10 points
- No connection: 0 points

**Example:**
- Client focus areas: ["Education", "Community Development"]
- Grant focus area: "Education"
- Result: Exact match (30 points)

### 3. Award Size Fit (15% weight)
**Purpose:** Assesses if the award amount is appropriate for the client's capacity.

- Compares grant amount to client's typical award size
- Considers if amount is within reasonable range (0.5x to 2x typical)
- Too small or too large grants may indicate poor fit

**Scoring Rules:**
- Within 0.5x to 2x of typical award: 12-15 points
- Within 0.25x to 4x of typical award: 5-10 points
- Outside typical range: 0-5 points

**Example:**
- Client typical award: $50,000
- Grant amount: $75,000 (1.5x typical)
- Result: Good fit (15 points)

### 4. Geographic Match (10% weight)
**Purpose:** Evaluates if the geographic scope works for the client's location/service area.

- Matches local, regional, state, national, or international scope
- Considers client's geographic focus and service area
- Accounts for remote/virtual program flexibility

**Example:**
- Client geographic focus: "California"
- Grant scope: "Western United States"
- Result: Good geographic match (8-10 points)

### 5. Beneficiary Alignment (5% weight)
**Purpose:** Checks if target beneficiaries align between grant and client.

- Compares populations served (e.g., youth, seniors, veterans)
- Looks for demographic overlap
- Considers community type (urban, rural, suburban)

**Example:**
- Client serves: "Low-income youth in urban areas"
- Grant targets: "Underserved youth populations"
- Result: Strong beneficiary alignment (4-5 points)

---

## Scoring Rules & Thresholds

### Minimum Scores
The AI follows these rules to ensure reasonable scoring:

1. **Any thematic connection**: Minimum 20% score
   - Even loose connections receive base score
   - Example: Both related to "social services" broadly

2. **Related subcategories**: 30-50% score
   - Broad categories match specific subcategories
   - Example: "Humanities" institution + "Digital Humanities" grant

3. **Zero score only when**: Absolutely NO connection whatsoever
   - Different sectors entirely (e.g., medical grant for arts org)
   - Incompatible geographic scopes
   - Mutually exclusive beneficiary requirements

### Score Interpretation

| Score Range | Badge Color | Label | Interpretation |
|-------------|-------------|-------|----------------|
| 80-100% | Green | Excellent Match | Strong alignment across all criteria |
| 60-79% | Blue | Good Match | Solid fit with minor gaps |
| 40-59% | Yellow | Potential Match | Some alignment, worth reviewing |
| 1-39% | Gray | Weak Match | Minimal alignment, low priority |
| 0% | None | No Match | No alignment detected |

---

## Sorting Algorithm

Opportunities are sorted using a **three-tier priority system**:

### Primary Sort: AI Alignment Score (Highest → Lowest)
- Grants with highest AI match scores appear first
- Ensures best matches are always at the top
- Example: 95% match before 60% match

### Secondary Sort: Focus Area Priority (When AI scores tie)
If two grants have identical AI scores, sort by focus area priority:

1. Grants matching **1st selected focus area**
2. Grants matching **2nd selected focus area**
3. ... continuing through all selected focus areas
4. Grants tagged as **"Other"** (priority 9998)
   - Potential matches where category is uncertain
   - Requires manual review
5. Grants with **no matching focus area** (priority 9999)
   - Definitely doesn't match client's areas
   - Only shown if no filters applied

### Tertiary Sort: Deadline (Earliest → Latest)
If AI score and focus area priority are identical:
- Sort by deadline date (earliest first)
- Null deadlines (ongoing programs) appear last

### Example Sort Order
```
1. 95% Match, Education (1st focus area), Deadline: Dec 15
2. 95% Match, Education (1st focus area), Deadline: Jan 10
3. 95% Match, Health (2nd focus area), Deadline: Dec 1
4. 85% Match, Education (1st focus area), Deadline: Dec 20
5. 85% Match, Other, Deadline: Nov 30
6. 70% Match, No match, Deadline: Dec 5
```

---

## Implementation Details

### API Integration

**Freelancer Mode:** AI matching is enabled by default when viewing client-specific opportunities.

Request parameters:
```javascript
{
  enableMatching: true,
  clientName: "Example Nonprofit",
  clientMission: "Supporting education access...",
  clientFocusAreas: ["Education", "Community Development"]
}
```

**Nonprofit Mode:** Uses simpler focus area tag matching (no AI).
- Rationale: Nonprofits manage their own profiles
- Freelancers benefit more from AI analysis for multiple clients

### Performance Considerations

1. **Caching Strategy**
   - AI scores calculated on-demand during fetch
   - Results included in API response
   - Frontend displays cached scores immediately

2. **Fallback Mechanism**
   - If AI call fails, uses keyword-based fallback scoring
   - Ensures system remains functional during outages
   - Fallback logic in `match-scoring.ts:114-186`

3. **Rate Limiting**
   - AI calls made server-side only
   - One call per opportunity per fetch
   - Parallelized with `Promise.all()` for speed

### Code Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| AI Scoring Logic | `src/lib/match-scoring.ts` | Core scoring algorithm |
| API Endpoint | `src/app/api/freelancer/opportunities/route.ts` | Fetches and scores opportunities |
| Frontend Display | `src/components/opportunities/opportunities-page.tsx` | UI rendering and sorting |
| Client Profile | `src/app/(freelancer)/freelancer/opportunities/page.tsx` | Fetches client data |

---

## User Experience

### Match Percentage Badges
Every grant displays a **color-coded badge** showing its match percentage:

```
┌─────────────────────────────────────────┐
│ Grant Name                              │
│ [95% Match] [Education] [Closing Soon]  │
│                                         │
│ ✨ Why this matches:                    │
│ Strong mission alignment focused on     │
│ expanding educational access in rural   │
│ communities. Award size appropriate     │
│ for organization's capacity.            │
└─────────────────────────────────────────┘
```

### Match Reasoning
AI provides **explainable reasoning** for each score:
- Brief 1-2 sentence explanation
- Key alignment points highlighted
- Potential challenges noted

This transparency helps users understand:
- **Why** a grant received its score
- **What** makes it a good/poor fit
- **Whether** to pursue it further

---

## Future Enhancements

### Potential Improvements

1. **Learning from User Feedback**
   - Track which matches users save/ignore
   - Adjust weights based on user behavior
   - Personalize scoring per freelancer

2. **Historical Success Data**
   - Factor in past award success rates
   - Boost scores for similar successful grants
   - Lower scores for frequently rejected types

3. **Collaboration Filtering**
   - "Organizations like yours also applied to..."
   - Learn from peer organization patterns
   - Suggest non-obvious matches

4. **Time-Based Urgency**
   - Boost scores for grants closing soon
   - Prioritize realistic application timelines
   - Account for client's capacity constraints

5. **Cost-Benefit Analysis**
   - Factor in application effort required
   - Balance match quality vs. competition level
   - Estimate ROI on application time

### Configuration Options

Consider adding user-adjustable settings:
```javascript
{
  scoringWeights: {
    missionAlignment: 40,  // Adjustable
    focusAreaMatch: 30,    // Adjustable
    awardSizeFit: 15,      // Adjustable
    geographicMatch: 10,   // Adjustable
    beneficiaryAlign: 5    // Adjustable
  },
  minimumScore: 40,        // Hide grants below threshold
  showReasoning: true      // Toggle AI explanations
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial AI-powered scoring implementation |

---

## References

- AI Model: Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
- Match Scoring Implementation: `src/lib/match-scoring.ts`
- API Documentation: `src/app/api/freelancer/opportunities/route.ts`

---

## Questions or Issues?

For questions about the scoring system or to suggest improvements:
1. Review this documentation
2. Check `src/lib/match-scoring.ts` for implementation details
3. Open an issue with specific scoring concerns
4. Test with real grant data and provide feedback

The scoring system is designed to be transparent, explainable, and continuously improvable based on user feedback.
