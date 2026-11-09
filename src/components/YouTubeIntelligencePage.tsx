// NovaVid AI Studio 2.1 — YouTube Intelligence Page
// Global content discovery for new and existing channels.
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  createIntelligenceSession,
  sortTopicsByOpportunity,
  type IntelligenceSession,
  type TopicSuggestion,
  type ChannelMode,
} from "../lib/globalYouTubeIntelligence";

const DEMAND_COLORS: Record<string, string> = {
  very_high: "text-emerald-400",
  high: "text-blue-400",
  medium: "text-yellow-400",
  low: "text-gray-400",
};

const COMPETITION_COLORS: Record<string, string> = {
  very_high: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-emerald-400",
};

const TREND_ICONS: Record<string, string> = {
  rising: "📈",
  stable: "➡️",
  declining: "📉",
  evergreen: "🌿",
  seasonal: "🗓️",
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface YouTubeIntelligencePageProps {
  onSelectTopic?: (topic: TopicSuggestion) => void;
}

export const YouTubeIntelligencePage: React.FC<YouTubeIntelligencePageProps> = ({ onSelectTopic }) => {
  const [mode, setMode] = useState<ChannelMode>("new_channel");
  const [niche, setNiche] = useState("technology");
  const [language, setLanguage] = useState("Urdu");
  const [region, setRegion] = useState("Pakistan");
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [session, setSession] = useState<IntelligenceSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortedTopics, setSortedTopics] = useState<TopicSuggestion[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [filterFormat, setFilterFormat] = useState<string>("all");

  const handleDiscover = async () => {
    setLoading(true);
    setTimeout(() => {
      const newSession = createIntelligenceSession({
        niche,
        language,
        region,
        mode,
        channelAnalytics: mode === "existing_channel" ? { channelName: "My Channel", topPerformingTopics: ["Python", "AI tools", "Freelancing"] } : undefined,
        competitors,
        topicCount: 20,
      });
      const sorted = sortTopicsByOpportunity(newSession.suggestions);
      setSession(newSession);
      setSortedTopics(sorted);
      setLoading(false);
    }, 600);
  };

  const addCompetitor = () => {
    const handle = competitorInput.trim();
    if (handle && !competitors.includes(handle)) {
      setCompetitors((prev) => [...prev, handle]);
      setCompetitorInput("");
    }
  };

  const displayTopics = filterFormat === "all"
    ? sortedTopics
    : sortedTopics.filter((t) => t.recommendedFormat === filterFormat);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
              GLOBAL YOUTUBE INTELLIGENCE ENGINE
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
              NEW CHANNEL MODE SUPPORTED
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">YouTube Intelligence Engine</h1>
          <p className="text-sm text-gray-400 mt-1">
            Discover 20+ high-opportunity video topics. Works even with zero subscribers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Channel Mode */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">📡 Channel Mode</h2>
            {(["new_channel", "existing_channel"] as ChannelMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all border ${
                  mode === m
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-gray-950 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {m === "new_channel" ? "🆕 New Channel (0 subscribers)" : "📊 Existing Channel (with analytics)"}
              </button>
            ))}
          </div>

          {/* Research Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">🔍 Research Settings</h2>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Niche / Category</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="technology">Technology</option>
                <option value="education">Education</option>
                <option value="finance">Finance & Business</option>
                <option value="gaming">Gaming</option>
                <option value="health">Health & Fitness</option>
                <option value="cooking">Cooking & Food</option>
                <option value="travel">Travel</option>
                <option value="entertainment">Entertainment</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="Urdu">Urdu</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Punjabi">Punjabi</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="Pakistan">Pakistan</option>
                <option value="India">India</option>
                <option value="Global">Global</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
              </select>
            </div>
          </div>

          {/* Competitor Intelligence */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">🔎 Competitor Intelligence</h2>
            <p className="text-xs text-gray-500">Add public competitor channels (optional)</p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                placeholder="@channel"
                className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={addCompetitor}
                className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-white border border-gray-700"
              >
                Add
              </button>
            </div>
            {competitors.map((c) => (
              <div key={c} className="flex items-center justify-between bg-gray-950 rounded-lg px-3 py-1.5">
                <span className="text-xs text-blue-400">{c}</span>
                <button onClick={() => setCompetitors((prev) => prev.filter((x) => x !== c))} className="text-xs text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>

          {/* Discover Button */}
          <button
            type="button"
            onClick={handleDiscover}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <><span className="animate-spin">🔄</span><span>Discovering Topics...</span></>
            ) : (
              <span>🚀 Auto Discover 20+ Topics</span>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 space-y-4">
          {!session && !loading && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-16 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-5xl">🌐</span>
              <p className="text-gray-400 font-medium">Configure your niche and click Auto Discover</p>
              <p className="text-xs text-gray-600">Works in New Channel Mode — no subscribers required</p>
            </div>
          )}

          {session && (
            <>
              {/* Session Summary */}
              <div className="bg-gray-900 border border-blue-500/20 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    {session.totalSuggestions} Topics Found
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    {session.niche.toUpperCase()} NICHE
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-700/50 text-gray-300 border border-gray-600">
                    {session.language} · {session.region}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${session.mode === "new_channel" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-orange-500/10 text-orange-400 border-orange-500/30"}`}>
                    {session.mode === "new_channel" ? "🆕 New Channel" : "📊 Existing Channel"}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {["all", "tutorial", "shorts", "long_form", "review"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilterFormat(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterFormat === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                    >
                      {f === "all" ? "All" : f.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-lg px-4 py-2 text-xs text-yellow-400">
                ⚠️ {session.disclaimer}
              </div>

              {/* Topic Cards */}
              <div className="space-y-3">
                {displayTopics.map((topic, i) => (
                  <div
                    key={topic.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/40 transition-all"
                  >
                    <button
                      type="button"
                      className="w-full p-4 text-left"
                      onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <span className="text-lg font-black text-gray-600 w-6 flex-shrink-0">#{i + 1}</span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white leading-snug">{topic.title}</h3>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <span className={`text-[11px] font-semibold ${DEMAND_COLORS[topic.recentDemandSignal]}`}>
                                📊 {topic.recentDemandSignal.replace(/_/g, " ")} demand
                              </span>
                              <span className={`text-[11px] font-semibold ${COMPETITION_COLORS[topic.competitionLevel]}`}>
                                ⚔️ {topic.competitionLevel} competition
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {TREND_ICONS[topic.trendDirection]} {topic.trendDirection}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                🎬 {topic.recommendedFormat.replace(/_/g, " ")} · {topic.suggestedDurationMinutes}min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xl font-black" style={{ color: topic.opportunityScore >= 70 ? "#10B981" : topic.opportunityScore >= 50 ? "#F59E0B" : "#6B7280" }}>
                              {topic.opportunityScore}
                            </div>
                            <div className="text-[10px] text-gray-500">score</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${CONFIDENCE_BADGE[topic.confidenceLevel]}`}>
                            {topic.confidenceLevel}
                          </span>
                          <span className="text-gray-600 text-xs">{expandedTopic === topic.id ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    </button>

                    {expandedTopic === topic.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-950 rounded-lg p-3 space-y-1">
                            <p className="text-gray-400 font-semibold uppercase tracking-wider">Why Viewers Will Watch</p>
                            <p className="text-gray-300">{topic.whyViewersInterested}</p>
                          </div>
                          <div className="bg-gray-950 rounded-lg p-3 space-y-1">
                            <p className="text-gray-400 font-semibold uppercase tracking-wider">Content Gap</p>
                            <p className="text-gray-300">{topic.contentGap}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[11px]">#{tag}</span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            disabled={generatingTopicId === topic.id}
                            onClick={() => {
                              setGeneratingTopicId(topic.id);
                              onSelectTopic?.(topic);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-75 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                          >
                            {generatingTopicId === topic.id ? "⚡ Opening Studio..." : "🎬 Generate Full Video"}
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all"
                          >
                            📅 Add to Calendar
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold border border-gray-700 transition-all"
                          >
                            📋 Save Topic
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

