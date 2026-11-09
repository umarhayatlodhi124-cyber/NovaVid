# AI AUDIENCE INTEREST & TOPIC DISCOVERY ENGINE

**Company:** LODHI TECHX  
**System:** NovaVid AI Studio 2.1  
**Module:** `src/lib/globalYouTubeIntelligence.ts`  

---

## 1. Engine Specifications

The Audience Interest Engine is engineered to generate a minimum of 20 deeply researched topic suggestions per session with transparent scoring metrics.

### Scoring Heuristics
The opportunity score $S \in [10, 100]$ is computed as follows:

$$S = 50 + \text{Score}_{\text{Demand}} + \text{Score}_{\text{Competition}} + \text{Score}_{\text{Trend}} + \text{Bonus}_{\text{Channel}}$$

Where:
- $\text{Score}_{\text{Demand}} \in \{+20, +12, +5, -5\}$ for `very_high`, `high`, `medium`, `low`.
- $\text{Score}_{\text{Competition}} \in \{+20, +10, -5, -15\}$ for `low`, `medium`, `high`, `very_high`.
- $\text{Score}_{\text{Trend}} \in \{+15, +8, +5, +3, -10\}$ for `rising`, `evergreen`, `seasonal`, `stable`, `declining`.
- $\text{Bonus}_{\text{Channel}} = +10$ if matching previous high-retention upload clusters.

### Algorithmic Transparency
NovaVid displays a permanent disclaimer informing creators that opportunity scores represent NovaVid's empirical synthesis of public signals and not private YouTube internal ranking weights.

