// NovaVid AI Studio 2.2 — Retention Heatmap & Script Hook Booster Page
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  analyzeScriptRetention,
  type RetentionAnalysisReport,
  type RetentionNode,
} from "../lib/retentionBooster";

interface RetentionBoosterPageProps {
  initialScript?: string;
}

export const RetentionBoosterPage: React.FC<RetentionBoosterPageProps> = ({
  initialScript = `Stop learning to code the old-fashioned way in 2025! 
If you are spending 6 months watching Python tutorials without building projects, you are burning your career.
Most computer science students in Pakistan get stuck in tutorial hell because nobody shows them real-world AI pipelines.
In this video, I will walk you through the exact 3-step autonomous roadmap that got our students hired in weeks.
Watch till the end because the third step will completely change how you think about software development.`,
}) => {
  const [scriptText, setScriptText] = useState(initialScript);
  const [report, setReport] = useState<RetentionAnalysisReport>(() => analyzeScriptRetention(initialScript));

  const handleAnalyze = () => {
    const res = analyzeScriptRetention(scriptText);
    setReport(res);
  };

  const INTERRUPT_ICONS: Record<string, string> = {
    zoom_in_cut: "🔍 Zoom In Cut",
    sound_effect: "🔊 Whoosh SFX",
    curiosity_question: "❓ Curiosity Loop",
    b_roll_overlay: "🎬 B-Roll Clip",
    visual_stat_card: "📊 Stat Graphic",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              AUDIENCE RETENTION PREDICTOR
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
              PATTERN INTERRUPT INJECTOR
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Retention Booster & Script Heatmap</h1>
          <p className="text-sm text-gray-400 mt-1">
            Detect where viewers will click off before you render, and inject smart visual/audio pattern interrupts.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Hook Score (First 30s)</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{report.hookScore} / 100</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Predicted Avg Retention</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{report.averageRetentionPercent}%</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Drop-off Risk Points</p>
          <p className="text-2xl font-black text-red-400 mt-1">{report.dropOffPointsCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Estimated Duration</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{report.estimatedVideoLengthMinutes} min</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Script Input */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">📝 Video Script</h2>
            <textarea
              rows={12}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30"
            >
              ⚡ Re-calculate Retention Heatmap
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">AI Optimization Rules</h3>
            <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
              {report.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Retention Heatmap Timeline */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">📈 Retention Heatmap & Interrupt Recommendations</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {report.retentionNodes.map((node: RetentionNode) => (
                <div
                  key={node.sentenceIndex}
                  className={`p-3 rounded-lg border text-xs space-y-2 ${
                    node.retentionRisk === "high_dropoff"
                      ? "bg-red-950/20 border-red-500/40"
                      : "bg-gray-950 border-gray-800"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-gray-400">00:{node.timestampSeconds < 10 ? "0" : ""}{node.timestampSeconds}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Retention:</span>
                      <span
                        className={`font-bold ${
                          node.predictedRetentionPercent >= 70
                            ? "text-emerald-400"
                            : node.predictedRetentionPercent >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {node.predictedRetentionPercent}%
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-200">{node.sentenceText}</p>

                  {node.suggestedInterrupt && (
                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        {INTERRUPT_ICONS[node.suggestedInterrupt]}
                      </span>
                      <span className="text-gray-400 italic">{node.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

