// NovaVid AI Studio 2.2 — A/B Testing Studio Page
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  generateABExperiment,
  type ABExperiment,
  type ABVariant,
} from "../lib/abTestingStudio";

export const ABTestingStudioPage: React.FC = () => {
  const [topic, setTopic] = useState("Best Python Frameworks for 2025");
  const [niche, setNiche] = useState("technology");
  const [experiment, setExperiment] = useState<ABExperiment>(() => generateABExperiment(topic, niche));

  const handleRunExperiment = () => {
    const res = generateABExperiment(topic, niche);
    setExperiment(res);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
              CLICK-THROUGH RATE OPTIMIZER
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
              3-VARIANT A/B MATRIX
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">A/B Testing Studio</h1>
          <p className="text-sm text-gray-400 mt-1">
            Simulate and predict which title + thumbnail combination will get the highest clicks on YouTube.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Video Core Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Channel Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="technology">Technology & AI</option>
              <option value="education">Education & Career</option>
              <option value="finance">Finance & Freelancing</option>
              <option value="gaming">Gaming</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRunExperiment}
          className="py-2.5 px-6 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm transition-all shadow-lg shadow-yellow-600/30"
        >
          ⚡ Run A/B Neural Simulation
        </button>
      </div>

      {/* Recommendation Banner */}
      <div className="p-4 bg-yellow-950/30 border border-yellow-500/30 rounded-xl text-xs text-yellow-300">
        💡 <strong>AI Prediction:</strong> {experiment.overallRecommendation}
      </div>

      {/* 3 Variants Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {experiment.variants.map((v: ABVariant) => (
          <div
            key={v.id}
            className={`bg-gray-900 border rounded-xl p-5 space-y-4 flex flex-col justify-between relative ${
              v.isPredictedWinner
                ? "border-yellow-500 ring-2 ring-yellow-500/30 bg-gradient-to-b from-yellow-950/10 to-gray-900"
                : "border-gray-800"
            }`}
          >
            {v.isPredictedWinner && (
              <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-500 text-black shadow">
                🏆 Predicted Winner
              </span>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-1 text-xs font-black rounded bg-gray-800 text-white">
                  VARIANT {v.variantLetter}
                </span>
                <div className="text-right">
                  <span className="text-xl font-black text-yellow-400">{v.predictedCTR}%</span>
                  <span className="text-[10px] text-gray-500 block">Est. CTR</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold mb-1">Headline Title</p>
                <h3 className="text-sm font-bold text-white leading-snug">{v.title}</h3>
              </div>

              {/* Mockup Thumbnail Preview */}
              <div className="aspect-video bg-gray-950 rounded-lg border border-gray-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white self-start">
                  {v.thumbnailBadge}
                </span>
                <p className="text-xs font-black text-yellow-400 uppercase drop-shadow text-center">
                  {v.thumbnailConcept}
                </p>
                <span className="text-[9px] text-gray-600 text-right">1280 × 720</span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-400 pt-2 border-t border-gray-800">
                <div className="flex justify-between">
                  <span>Power Words:</span>
                  <span className="text-white font-bold">{v.powerWordCount} keywords</span>
                </div>
                <div className="flex justify-between">
                  <span>Emotional Trigger:</span>
                  <span className="text-yellow-400 capitalize">{v.emotionalTrigger}</span>
                </div>
                <div className="flex justify-between">
                  <span>Readability:</span>
                  <span className="text-gray-300">{v.readabilityGrade}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-800">
              "{v.critique}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

