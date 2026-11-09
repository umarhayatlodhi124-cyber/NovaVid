// NovaVid AI Studio 2.1 — Content Planner Page
// Autonomous weekly/monthly content calendar with strategic rationale.
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  generateContentCalendar,
  groupByWeek,
  buildMonthlyCalendar,
  type ContentSlot,
  type ContentPlannerConfig,
} from "../lib/autonomousContentPlanner";

const FORMAT_COLORS: Record<string, string> = {
  shorts: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  tutorial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  long_form: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  series_episode: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  documentary: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

const PRIORITY_ICONS: Record<string, string> = {
  trending: "🔥",
  evergreen: "🌿",
  seasonal: "🗓️",
  series: "📺",
};

export const ContentPlannerPage: React.FC = () => {
  const [config, setConfig] = useState<ContentPlannerConfig>({
    niche: "technology",
    language: "Urdu",
    channelGoal: "balanced",
    videosPerWeek: 2,
    includeShorts: true,
    shortsPerWeek: 1,
    weeksToplan: 4,
    startDate: new Date().toISOString().split("T")[0],
  });
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [generated, setGenerated] = useState(false);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");

  const handleGenerate = () => {
    const newSlots = generateContentCalendar(config);
    setSlots(newSlots);
    setGenerated(true);
  };

  const weeks = groupByWeek(slots);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthCalendar = generated ? buildMonthlyCalendar(slots, currentYear, currentMonth) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
              AUTONOMOUS CONTENT STRATEGY
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
              AI CONTENT CALENDAR
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Content Strategy Planner</h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate a strategic weekly/monthly content calendar with Shorts vs Long-Form balance and rationale.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Config Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">⚙️ Planner Settings</h2>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Niche</label>
              <select value={config.niche} onChange={(e) => setConfig({ ...config, niche: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="technology">Technology</option>
                <option value="education">Education</option>
                <option value="finance">Finance</option>
                <option value="gaming">Gaming</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Channel Goal</label>
              <select value={config.channelGoal} onChange={(e) => setConfig({ ...config, channelGoal: e.target.value as ContentPlannerConfig["channelGoal"] })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="grow_fast">Grow Fast</option>
                <option value="build_authority">Build Authority</option>
                <option value="monetize">Monetize</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Long-Form Videos / Week: {config.videosPerWeek}</label>
              <input type="range" min={1} max={7} value={config.videosPerWeek}
                onChange={(e) => setConfig({ ...config, videosPerWeek: Number(e.target.value) })}
                className="w-full accent-purple-500" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Include YouTube Shorts</label>
              <button onClick={() => setConfig({ ...config, includeShorts: !config.includeShorts })}
                className={`w-10 h-5 rounded-full transition-all ${config.includeShorts ? "bg-purple-500" : "bg-gray-700"}`}>
                <span className={`block w-4 h-4 rounded-full bg-white shadow transition-all ${config.includeShorts ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {config.includeShorts && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Shorts / Week: {config.shortsPerWeek}</label>
                <input type="range" min={1} max={5} value={config.shortsPerWeek}
                  onChange={(e) => setConfig({ ...config, shortsPerWeek: Number(e.target.value) })}
                  className="w-full accent-pink-500" />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Weeks to Plan: {config.weeksToplan}</label>
              <input type="range" min={1} max={12} value={config.weeksToplan}
                onChange={(e) => setConfig({ ...config, weeksToplan: Number(e.target.value) })}
                className="w-full accent-blue-500" />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Start Date</label>
              <input type="date" value={config.startDate} onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>

          <button type="button" onClick={handleGenerate}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/30">
            📅 Generate Content Calendar
          </button>
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-3 space-y-4">
          {!generated ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-16 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-5xl">📅</span>
              <p className="text-gray-400 font-medium">Configure your plan and click Generate</p>
              <p className="text-xs text-gray-600">AI will create a strategic content calendar with rationale for each slot</p>
            </div>
          ) : (
            <>
              {/* View toggle + Stats */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex space-x-2">
                  {(["weekly", "monthly"] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      {v === "weekly" ? "📋 Weekly View" : "📆 Monthly Summary"}
                    </button>
                  ))}
                </div>
                <div className="flex space-x-3 text-xs text-gray-400">
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">{slots.filter((s) => !s.isShorts).length} Long-Form</span>
                  <span className="bg-pink-500/10 text-pink-400 px-2 py-1 rounded border border-pink-500/20">{slots.filter((s) => s.isShorts).length} Shorts</span>
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">{slots.length} Total</span>
                </div>
              </div>

              {view === "weekly" && (
                <div className="space-y-4">
                  {weeks.map((week) => (
                    <div key={week.weekNumber} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-gray-800/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Week {week.weekNumber} — {week.startDate} to {week.endDate}</h3>
                        <div className="flex space-x-2 text-xs">
                          <span className="text-purple-400">{week.longFormCount} long-form</span>
                          <span className="text-pink-400">{week.shortsCount} shorts</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-gray-500 italic">{week.strategicNotes}</p>
                        {week.slots.map((slot) => (
                          <div key={slot.id} className="flex items-start space-x-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
                            <div className="flex-shrink-0 text-center w-14">
                              <p className="text-xs font-bold text-gray-300 capitalize">{slot.dayOfWeek.substring(0, 3)}</p>
                              <p className="text-xs text-gray-500">{slot.date.split("-").slice(1).join("/")}</p>
                              <p className="text-[10px] text-blue-400 mt-0.5">{slot.recommendedPublishTime}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${FORMAT_COLORS[slot.videoFormat] || "bg-gray-700/50 text-gray-400 border-gray-700"}`}>
                                  {slot.videoFormat.replace(/_/g, " ").toUpperCase()}
                                </span>
                                <span className="text-[10px] text-gray-500">{PRIORITY_ICONS[slot.priority]} {slot.priority}</span>
                                <span className="text-[10px] text-gray-600">{slot.estimatedDurationMinutes}min</span>
                              </div>
                              <p className="text-xs font-semibold text-white leading-snug">{slot.videoTopic}</p>
                              <p className="text-[11px] text-gray-500 mt-1 leading-snug">{slot.strategicRationale}</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded border flex-shrink-0 ${
                              slot.status === "planned" ? "bg-gray-700/30 text-gray-400 border-gray-700" :
                              slot.status === "published" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                              "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }`}>
                              {slot.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {view === "monthly" && monthCalendar && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">{monthCalendar.monthName} {monthCalendar.year}</h2>
                    <div className="flex space-x-3 text-xs">
                      <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded border border-purple-500/20">{monthCalendar.totalLongForm} Long-Form ({monthCalendar.contentMix.longForm}%)</span>
                      <span className="bg-pink-500/10 text-pink-400 px-3 py-1 rounded border border-pink-500/20">{monthCalendar.totalShorts} Shorts ({monthCalendar.contentMix.shorts}%)</span>
                    </div>
                  </div>
                  <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-300 font-medium">📊 AI Recommendation</p>
                    <p className="text-xs text-gray-400 mt-1">{monthCalendar.recommendation}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-950 rounded-lg p-3 text-center">
                      <p className="text-2xl font-black text-white">{monthCalendar.totalPlannedVideos}</p>
                      <p className="text-xs text-gray-500">Total Videos</p>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3 text-center">
                      <p className="text-2xl font-black text-purple-400">{monthCalendar.totalLongForm}</p>
                      <p className="text-xs text-gray-500">Long-Form</p>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3 text-center">
                      <p className="text-2xl font-black text-pink-400">{monthCalendar.totalShorts}</p>
                      <p className="text-xs text-gray-500">Shorts</p>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3 text-center">
                      <p className="text-2xl font-black text-blue-400">{monthCalendar.weeks.length}</p>
                      <p className="text-xs text-gray-500">Active Weeks</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

