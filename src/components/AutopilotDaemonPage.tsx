// NovaVid AI Studio 2.2 — Autopilot Daemon Page
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  createAutopilotSchedule,
  simulateAutonomousRun,
  type AutopilotSchedule,
  type AutopilotRunEvent,
} from "../lib/autopilotDaemon";

export const AutopilotDaemonPage: React.FC = () => {
  const [schedule, setSchedule] = useState<AutopilotSchedule>(() =>
    createAutopilotSchedule({ niche: "technology", scheduledTimePKT: "09:00" })
  );
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<AutopilotRunEvent[]>([]);

  const handleTriggerManualRun = () => {
    setIsRunning(true);
    setEvents([]);
    const simulated = simulateAutonomousRun(schedule);

    simulated.forEach((event, idx) => {
      setTimeout(() => {
        setEvents((prev) => [...prev, event]);
        if (idx === simulated.length - 1) {
          setIsRunning(false);
          setSchedule((s) => ({
            ...s,
            totalAutonomousUploads: s.totalAutonomousUploads + 1,
            lastRunAt: new Date().toISOString(),
          }));
        }
      }, (idx + 1) * 600);
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              100% HANDS-FREE AUTOMATION
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              DAILY AUTONOMOUS PUBLISHER
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Auto-Pilot Background Daemon</h1>
          <p className="text-sm text-gray-400 mt-1">
            Wake up to newly published videos. NovaVid researches, creates, edits, designs thumbnails, and publishes daily automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Config */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">⚙️ Daemon Schedule Settings</h2>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Target Niche</label>
            <select
              value={schedule.niche}
              onChange={(e) => setSchedule({ ...schedule, niche: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="technology">Technology & AI</option>
              <option value="education">Educational Explainers</option>
              <option value="finance">Finance & Passive Income</option>
              <option value="gaming">Gaming News</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Daily Trigger Time (PKT)</label>
            <input
              type="time"
              value={schedule.scheduledTimePKT}
              onChange={(e) => setSchedule({ ...schedule, scheduledTimePKT: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="p-3 bg-gray-950 rounded-lg border border-gray-800 space-y-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-400 font-bold">DAEMON ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>Next Scheduled Run:</span>
              <span className="text-white font-mono">{schedule.nextRunAt.split("T")[0]} {schedule.scheduledTimePKT} PKT</span>
            </div>
            <div className="flex justify-between">
              <span>Autonomous Uploads:</span>
              <span className="text-cyan-400 font-bold">{schedule.totalAutonomousUploads} videos</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTriggerManualRun}
            disabled={isRunning}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2"
          >
            {isRunning ? (
              <><span>⚙️</span><span>Autonomous Pipeline Running...</span></>
            ) : (
              <span>⚡ Trigger Instant Auto-Pilot Run</span>
            )}
          </button>
        </div>

        {/* Live Event Stream */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">📡 Live Pipeline Execution Logs</h2>

          {events.length === 0 && !isRunning && (
            <div className="p-16 border border-dashed border-gray-800 rounded-xl text-center space-y-2">
              <span className="text-4xl">🤖</span>
              <p className="text-xs text-gray-400">Daemon is standing by for scheduled execution or manual trigger</p>
            </div>
          )}

          {events.length > 0 && (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.stage}
                  className="p-3.5 rounded-lg bg-gray-950 border border-gray-800 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {event.stage}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{event.progressPercent}%</span>
                  </div>
                  <p className="text-gray-200">{event.logMessage}</p>
                  {event.youtubeVideoId && (
                    <div className="text-[11px] text-pink-400 font-mono">
                      YouTube Video ID: {event.youtubeVideoId} • Watch Status: Published
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

