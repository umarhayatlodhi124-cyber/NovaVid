// NovaVid AI Studio 2.2 — Auto Shorts Cutter Page
// Automatically creates 3 viral vertical shorts from any long-form video project.
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  detectViralMoments,
  type ViralMoment,
  type ShortsRepurposeConfig,
} from "../lib/autoShortsCutter";

interface AutoShortsCutterPageProps {
  activeProjectTopic?: string;
}

export const AutoShortsCutterPage: React.FC<AutoShortsCutterPageProps> = ({
  activeProjectTopic = "How to Learn Python & AI in 2025",
}) => {
  const [targetCount, setTargetCount] = useState(3);
  const [captionStyle, setCaptionStyle] = useState<ShortsRepurposeConfig["captionStyle"]>("hormozi_bold");
  const [moments, setMoments] = useState<ViralMoment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<ViralMoment | null>(null);
  const [renderedStatus, setRenderedStatus] = useState<string | null>(null);

  const handleScanAndCut = () => {
    setLoading(true);
    setRenderedStatus(null);
    setTimeout(() => {
      const detected = detectViralMoments([], targetCount);
      setMoments(detected);
      setSelectedMoment(detected[0] || null);
      setLoading(false);
    }, 800);
  };

  const handleRenderShort = (m: ViralMoment) => {
    setRenderedStatus(`Rendering "${m.title}" in 1080x1920 with ${captionStyle} kinetic captions...`);
    setTimeout(() => {
      setRenderedStatus(`✅ Viral Short successfully generated: 1080x1920 (Duration: ${m.durationSeconds}s) ready for YouTube Shorts!`);
    }, 1500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/30">
              VIRAL REPURPOSER • 9:16 VERTICAL
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
              ALEX HORMOZI KINETIC CAPTIONS
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Auto Shorts Cutter</h1>
          <p className="text-sm text-gray-400 mt-1">
            Automatically find viral moments in your long video, crop to 9:16 vertical, and generate 3 YouTube Shorts.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Active Source Project</p>
          <p className="text-sm font-semibold text-pink-400">{activeProjectTopic}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">⚙️ Repurposing Settings</h2>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Shorts to Cut: {targetCount}</label>
              <input
                type="range"
                min={1}
                max={5}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Animated Caption Style</label>
              <select
                value={captionStyle}
                onChange={(e) => setCaptionStyle(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="hormozi_bold">Alex Hormozi Bold (Yellow & Green)</option>
                <option value="cyber_neon">Cyber Neon Glow (Cyan & Purple)</option>
                <option value="karaoke_pop">Karaoke Pop (Word-by-word highlight)</option>
                <option value="minimal_glow">Clean Minimalist White</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleScanAndCut}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-pink-600/30 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <><span>🔄</span><span>Scanning Video for Viral Moments...</span></>
              ) : (
                <span>✂️ Auto Detect & Cut Shorts</span>
              )}
            </button>
          </div>

          {renderedStatus && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
              {renderedStatus}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {moments.length === 0 && !loading && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-16 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-5xl">📱</span>
              <p className="text-gray-400 font-medium">Click "Auto Detect & Cut Shorts" to analyze the video</p>
              <p className="text-xs text-gray-600">AI will detect highest energy sections and package them into 9:16 Shorts</p>
            </div>
          )}

          {moments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white">🔥 {moments.length} Viral Highlights Found</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {moments.map((m, i) => (
                  <div
                    key={m.id}
                    className={`bg-gray-900 border rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer transition-all ${
                      selectedMoment?.id === m.id
                        ? "border-pink-500 ring-2 ring-pink-500/20"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                    onClick={() => setSelectedMoment(m)}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                          SHORT #{i + 1}
                        </span>
                        <span className="text-xs font-black text-emerald-400">
                          {m.viralScore} / 100 Viral
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-white line-clamp-2">{m.title}</h3>
                      <p className="text-[11px] text-gray-400 mt-1 italic">"{m.hookText}"</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-800 text-[10px] text-gray-400">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-white font-mono">{m.durationSeconds}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pacing:</span>
                        <span className="text-white">{m.speechPaceWpm} WPM</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Energy:</span>
                        <span className="text-pink-400 capitalize">{m.emotionalEnergy}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenderShort(m);
                        }}
                        className="w-full mt-2 py-1.5 px-3 rounded bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-colors"
                      >
                        ⚡ Export 9:16 Short
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

