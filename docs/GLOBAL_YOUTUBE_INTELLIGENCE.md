# GLOBAL YOUTUBE INTELLIGENCE ENGINE SPECIFICATION

**Company:** LODHI TECHX  
**System:** NovaVid AI Studio 2.1  
**Module:** `src/lib/globalYouTubeIntelligence.ts`  
**UI Interface:** `src/components/YouTubeIntelligencePage.tsx`  

---

## 1. Objectives & Modalities

The Global YouTube Intelligence Engine is engineered to empower content creators to identify viral velocity and viewer demand before investing production resources.

### Operating Modes:
1. **New Channel Mode (Zero Analytics):**
   - Operates independently of subscriber base or past upload history.
   - Leverages public YouTube Data API v3 search signals, query volume trends, and content gap indexing.
   - Evaluates competition density: detects underserved sub-niches where demand outstrips existing high-quality video inventory.
2. **Existing Channel Mode (Personalized Growth):**
   - Ingests authorized channel analytics: impressions, CTR, average view duration (AVD), and retention curve drops.
   - Analyzes topical affinities of top 10% performing channel uploads.
   - Boosts recommended opportunity scores for topics closely related to verified audience retention anchors.

---

## 2. Recommendation Architecture

- **Session Generator:** `createIntelligenceSession()`
- **Output:** Generates 20+ structured topic suggestions per query session.
- **Data Points per Topic:**
  - Topic Title & Description
  - Viewer Psychological Hook ("Why viewers will watch")
  - Content Gap Identification
  - Demand Signal (`very_high`, `high`, `medium`, `low`)
  - Competition Level (`very_high`, `high`, `medium`, `low`)
  - Trend Direction (`rising`, `stable`, `evergreen`, `seasonal`, `declining`)
  - Format Recommendation (`long_form`, `shorts`, `series`, `tutorial`, `documentary`, `review`)
  - Suggested Duration in minutes
  - Opportunity Score (0–100) & Confidence Level (`high`, `medium`, `low`)

