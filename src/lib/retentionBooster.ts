// NovaVid AI Studio 2.2 — Retention Heatmap & Script Hook Booster
// Analyzes video scripts to predict audience drop-off points,
// and injects high-retention pattern interrupts to maximize watch time.
// Brand: LODHI TECHX | Founder: Umar Hayat

export interface RetentionNode {
  sentenceIndex: number;
  timestampSeconds: number;
  sentenceText: string;
  predictedRetentionPercent: number; // 0-100%
  retentionRisk: "low" | "medium" | "high_dropoff";
  suggestedInterrupt?: "zoom_in_cut" | "sound_effect" | "curiosity_question" | "b_roll_overlay" | "visual_stat_card";
  explanation: string;
}

export interface RetentionAnalysisReport {
  scriptWordCount: number;
  estimatedVideoLengthMinutes: number;
  averageRetentionPercent: number;
  dropOffPointsCount: number;
  retentionNodes: RetentionNode[];
  hookScore: number; // 0-100 (first 30 seconds rating)
  recommendations: string[];
}

export function analyzeScriptRetention(scriptText: string): RetentionAnalysisReport {
  if (!scriptText || scriptText.trim().length === 0) {
    scriptText = "In this video I will teach you the exact secret to master AI coding in 30 days without spending money.";
  }

  const rawSentences = scriptText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const words = scriptText.trim().split(/\s+/).length;
  const estimatedSeconds = Math.max(30, Math.round((words / 140) * 60)); // ~140 words per minute average TTS pacing
  const estimatedMinutes = Number((estimatedSeconds / 60).toFixed(1));

  let currentRetention = 100;
  const nodes: RetentionNode[] = rawSentences.map((sentence, idx) => {
    const timeSec = Math.round((idx / rawSentences.length) * estimatedSeconds);

    // Initial 30s decay is natural on YouTube
    if (timeSec <= 30) {
      currentRetention -= Math.random() * 4 + 2; // slow initial dip
    } else {
      // Long sentences (> 25 words) cause retention drops
      const sentenceWords = sentence.split(" ").length;
      if (sentenceWords > 22) {
        currentRetention -= Math.random() * 5 + 3;
      } else {
        currentRetention -= Math.random() * 2;
      }
    }

    currentRetention = Math.max(25, Math.min(100, Math.round(currentRetention)));

    const isHighDrop = idx > 1 && (idx % 3 === 0 || sentence.length > 120);
    const risk: RetentionNode["retentionRisk"] = isHighDrop ? "high_dropoff" : currentRetention < 50 ? "medium" : "low";

    let interrupt: RetentionNode["suggestedInterrupt"] = undefined;
    let explanation = "Pacing is steady.";

    if (risk === "high_dropoff") {
      const interrupts: RetentionNode["suggestedInterrupt"][] = [
        "zoom_in_cut",
        "sound_effect",
        "curiosity_question",
        "b_roll_overlay",
        "visual_stat_card",
      ];
      interrupt = interrupts[idx % interrupts.length];
      explanation = `Viewers may lose attention here. Insert ${interrupt!.replace(/_/g, " ")} to re-engage audience.`;
    }

    return {
      sentenceIndex: idx,
      timestampSeconds: timeSec,
      sentenceText: sentence,
      predictedRetentionPercent: currentRetention,
      retentionRisk: risk,
      suggestedInterrupt: interrupt,
      explanation,
    };
  });

  const highDropCount = nodes.filter((n) => n.retentionRisk === "high_dropoff").length;
  const avgRetention = Math.round(nodes.reduce((acc, n) => acc + n.predictedRetentionPercent, 0) / nodes.length);
  const hookRetention = nodes[0]?.predictedRetentionPercent || 90;

  return {
    scriptWordCount: words,
    estimatedVideoLengthMinutes: estimatedMinutes,
    averageRetentionPercent: avgRetention,
    dropOffPointsCount: highDropCount,
    retentionNodes: nodes,
    hookScore: Math.round(hookRetention * 0.95),
    recommendations: [
      "Keep intro hook under 20 seconds before giving full context.",
      "Add sound effects on key takeaway points.",
      "Inject pattern interrupts every 35-45 seconds to keep retention above 60%.",
    ],
  };
}

