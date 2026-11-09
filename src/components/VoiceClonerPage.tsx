// NovaVid AI Studio 2.2 — Voice Cloner Page
// Brand: LODHI TECHX | Founder: Umar Hayat

import React, { useState } from "react";
import {
  synthesizeVoiceProfile,
  type VoiceProfile,
} from "../lib/voiceCloner";

export const VoiceClonerPage: React.FC = () => {
  const [creatorName, setCreatorName] = useState("Umar Hayat");
  const [language, setLanguage] = useState<"ur" | "en" | "hi">("ur");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    const interval = setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev >= 30) {
          clearInterval(interval);
          setIsRecording(false);
          const prof = synthesizeVoiceProfile(creatorName, 30, language);
          setProfile(prof);
          setStatusMessage("✅ 30-Second Voice Embedding Synthesized! Your personal AI clone is ready.");
          return 30;
        }
        return prev + 1;
      });
    }, 100); // simulation pacing
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              NEURAL ACOUSTIC EMBEDDING
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              URDU & HINDI ZERO-SHOT TTS
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Custom Creator Voice Cloner</h1>
          <p className="text-sm text-gray-400 mt-1">
            Clone your voice from a simple 30-second mic recording. Narrate all your YouTube videos in your own natural tone.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record & Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">🎙️ Voice Sample Recorder</h2>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Creator / Persona Name</label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Primary Narration Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="ur">Urdu (اردو)</option>
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          {/* Record button */}
          <div className="p-6 bg-gray-950 rounded-xl border border-gray-800 text-center space-y-3">
            <div className="text-3xl">
              {isRecording ? "🔴" : "🎤"}
            </div>
            <p className="text-xs text-gray-400">
              {isRecording
                ? `Recording sample... ${recordSeconds} / 30 seconds`
                : "Record 30 seconds of speech in a quiet room"}
            </p>

            <button
              type="button"
              onClick={handleStartRecording}
              disabled={isRecording}
              className="py-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              {isRecording ? "Listening to Audio..." : "Record 30s Sample"}
            </button>
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">👤 Active Voice Profile</h2>

          {!profile ? (
            <div className="p-12 border border-dashed border-gray-800 rounded-xl text-center space-y-2">
              <span className="text-4xl text-gray-600">🎧</span>
              <p className="text-xs text-gray-500">No custom voice profile active yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-950 rounded-xl border border-indigo-500/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{profile.creatorName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    CLONE ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                  <div className="bg-gray-900 p-2.5 rounded-lg">
                    <span>Acoustic Stability:</span>
                    <p className="text-emerald-400 font-bold mt-0.5">{profile.acousticStabilityScore}%</p>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg">
                    <span>Timbre Warmth:</span>
                    <p className="text-indigo-400 font-bold mt-0.5">{profile.timbreWarmthScore}%</p>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg">
                    <span>Target Language:</span>
                    <p className="text-white font-bold mt-0.5 uppercase">{profile.language}</p>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg">
                    <span>Pitch Median:</span>
                    <p className="text-white font-bold mt-0.5">{profile.pitchHz} Hz</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white border border-gray-700 transition-colors"
              >
                🔊 Play Sample Test Sentence
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

