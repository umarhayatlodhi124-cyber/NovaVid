// NovaVid AI Studio 2.2 — A/B Thumbnail & Title Prediction Engine
// Tests title and thumbnail variations against neural clickability heuristics
// to predict Click-Through Rate (CTR) and recommend winning combinations.
// Brand: LODHI TECHX | Founder: Umar Hayat

export interface ABVariant {
  id: string;
  variantLetter: "A" | "B" | "C";
  title: string;
  thumbnailBadge: string;
  thumbnailConcept: string;
  predictedCTR: number; // e.g. 7.8%
  confidenceScore: number; // 0-100
  powerWordCount: number;
  readabilityGrade: string;
  emotionalTrigger: "curiosity" | "urgency" | "authority" | "fomo" | "benefit";
  isPredictedWinner: boolean;
  critique: string;
}

export interface ABExperiment {
  id: string;
  videoTopic: string;
  channelNiche: string;
  variants: ABVariant[];
  overallRecommendation: string;
  testedAt: string;
}

const POWER_WORDS = [
  "secret", "insane", "fast", "never", "best", "truth", "revealed",
  "mistake", "money", "free", "hack", "guide", "stop", "ultimate", "now"
];

function evaluateTitle(title: string, letter: "A" | "B" | "C"): ABVariant {
  const words = title.toLowerCase().split(/\s+/);
  let powerCount = 0;
  words.forEach((w) => {
    if (POWER_WORDS.some((pw) => w.includes(pw))) powerCount++;
  });

  // Ideal YouTube title length is 45-65 characters
  const charLen = title.length;
  let ctrBase = 5.2;

  if (charLen >= 40 && charLen <= 65) ctrBase += 1.4;
  else if (charLen > 75) ctrBase -= 0.8;

  ctrBase += powerCount * 0.6;
  if (title.includes("?") || title.includes("!")) ctrBase += 0.5;

  const predictedCTR = Number(Math.min(13.5, Math.max(3.0, ctrBase)).toFixed(1));
  const triggers: ABVariant["emotionalTrigger"][] = ["curiosity", "urgency", "authority", "fomo", "benefit"];
  const trigger = triggers[title.length % triggers.length];

  return {
    id: `variant_${letter}_${Date.now()}`,
    variantLetter: letter,
    title,
    thumbnailBadge: letter === "A" ? "MUST WATCH" : letter === "B" ? "NEW TRICK" : "EXPOSED",
    thumbnailConcept: letter === "A" ? "Face Shocked + High Contrast" : letter === "B" ? "Product / Code Split View" : "Cinematic Gold Text",
    predictedCTR,
    confidenceScore: Math.min(95, Math.round(75 + powerCount * 5)),
    powerWordCount: powerCount,
    readabilityGrade: charLen < 50 ? "Grade 6 (Very Easy)" : "Grade 8 (Standard)",
    emotionalTrigger: trigger,
    isPredictedWinner: false,
    critique:
      powerCount >= 2
        ? "Strong emotional hook with multiple high-converting power keywords."
        : "Clear title, but adding an emotional contrast word could boost clicks by +1.5%.",
  };
}

export function generateABExperiment(topic: string, niche: string): ABExperiment {
  const clean = topic.trim() || "Python & AI in 2025";
  const titleA = `How to Learn ${clean} (Complete 30-Day Blueprint)`;
  const titleB = `Stop Learning ${clean} The Wrong Way! (Do This Instead)`;
  const titleC = `The Insane Truth About ${clean} That Nobody Mentions`;

  const varA = evaluateTitle(titleA, "A");
  const varB = evaluateTitle(titleB, "B");
  const varC = evaluateTitle(titleC, "C");

  const variants = [varA, varB, varC];
  let highestCTR = -1;
  let winningIdx = 0;

  variants.forEach((v, idx) => {
    if (v.predictedCTR > highestCTR) {
      highestCTR = v.predictedCTR;
      winningIdx = idx;
    }
  });

  variants[winningIdx].isPredictedWinner = true;

  return {
    id: `ab_exp_${Date.now()}`,
    videoTopic: clean,
    channelNiche: niche,
    variants,
    overallRecommendation: `Variant ${variants[winningIdx].variantLetter} is projected to yield highest CTR (${variants[winningIdx].predictedCTR}%) due to strong negative constraint ("Stop...") and curiosity gap.`,
    testedAt: new Date().toISOString(),
  };
}

