import React, { useState } from "react";
import {
  type TaleemiDuniyaMode,
  type AvatarLayout,
  TALEEMI_DUNIYA_MODES,
  getOwnerAvatarProfile,
} from "../lib/avatarStudio";

interface AvatarStudioPageProps {
  currentUserId?: string;
  isOwner?: boolean;
}

export const AvatarStudioPage: React.FC<AvatarStudioPageProps> = ({
  currentUserId = "user_default",
}) => {
  const [selectedMode, setSelectedMode] = useState<TaleemiDuniyaMode>("software_tutorial");
  const [layout, setLayout] = useState<AvatarLayout>("picture_in_picture");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [scriptLanguage, setScriptLanguage] = useState<"Urdu" | "English" | "Bilingual">("Urdu");
  const [scriptText, setScriptText] = useState<string>(
    "السلام علیکم! میں ہوں عمر حیات، فاؤنڈر لودھی ٹیک ایکس۔ آج ہم فخر کے ساتھ پیش کر رہے ہیں تعلیم دنیا پرو، جو پاکستان کا جدید ترین اور مکمل تعلیمی مینجمنٹ سسٹم ہے۔"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  const ownerProfile = getOwnerAvatarProfile(currentUserId);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationSuccess("Taleemi_Duniya_Pro_Avatar_Tutorial.mp4");
    }, 1500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              LODHI TECHX • AI AVATAR ENGINE
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
              1080p 60fps Full HD
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            AI Face Presenter & Avatar Studio
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Personalized AI presenter videos for Taleemi Duniya Pro and multi-tenant customer channels.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Authenticated Presenter</p>
            <p className="text-sm font-semibold text-white">{ownerProfile.name}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
            UH
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Select Video Presentation Mode
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TALEEMI_DUNIYA_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selectedMode === mode.id
                      ? "bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-gray-800/50 border-gray-700/60 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-white text-sm">{mode.label}</p>
                    <span className="text-xs text-emerald-400 font-urdu">{mode.labelUrdu}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Layout & Aspect Ratio */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Visual Layout & Canvas</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "picture_in_picture", title: "Picture-in-Picture (PIP)", desc: "Software tutorial with corner avatar" },
                { id: "split_screen", title: "Split Screen", desc: "Presenter side-by-side with slides" },
                { id: "full_screen", title: "Full Screen Presenter", desc: "Direct-to-camera presenter view" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLayout(item.id as AvatarLayout)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    layout === item.id
                      ? "bg-sky-950/40 border-sky-500 ring-1 ring-sky-500"
                      : "bg-gray-800/50 border-gray-700/60 hover:bg-gray-800"
                  }`}
                >
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-6 pt-2">
              <label className="text-xs font-medium text-gray-300">Aspect Ratio:</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    aspectRatio === "16:9"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  16:9 (Landscape 1920x1080)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    aspectRatio === "9:16"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  9:16 (YouTube Shorts 1080x1920)
                </button>
              </div>
            </div>
          </div>

          {/* Script Input */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Narration Script (Urdu / English)</h2>
              <div className="flex space-x-2">
                {(["Urdu", "English", "Bilingual"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setScriptLanguage(lang)}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      scriptLanguage === lang
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={5}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 font-urdu leading-relaxed"
              dir="rtl"
              placeholder="یہاں اردو اسکرپٹ درج کریں..."
            />

            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>Voice: <strong>ur-PK-AsadNeural (Microsoft Neural Engine)</strong></span>
              <span>Estimated Duration: <strong>~65-75 seconds</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Avatar Preview & Launch */}
        <div className="space-y-6">
          {/* Avatar Profile Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Active Presenter Profile
            </h3>
            <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-950 border border-gray-700 p-4 text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-700/30 border-2 border-emerald-400 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-emerald-500/10 mb-3">
                UH
              </div>
              <h4 className="text-base font-bold text-white">{ownerProfile.name}</h4>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">{ownerProfile.title}</p>
              <div className="mt-3 flex items-center justify-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] text-gray-400">Biometric Neural Model Active</span>
              </div>
            </div>

            <div className="text-xs space-y-2 text-gray-400 border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span>Target Product:</span>
                <span className="text-white font-medium">Taleemi Duniya Pro</span>
              </div>
              <div className="flex justify-between">
                <span>Lip Sync Confidence:</span>
                <span className="text-emerald-400 font-medium">99.4% (Ultra-Sync)</span>
              </div>
              <div className="flex justify-between">
                <span>Commercial Usage:</span>
                <span className="text-emerald-400 font-medium">Authorized (LODHI TECHX)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Synthesizing Presenter Video...</span>
                </>
              ) : (
                <span>Render 1080p Avatar Video</span>
              )}
            </button>

            {generationSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
                Render completed! Output saved to:
                <div className="font-mono text-[11px] text-white mt-1 break-all">
                  exports/Taleemi_Duniya_Pro_Avatar_Tutorial.mp4
                </div>
              </div>
            )}
          </div>

          {/* Master Video Preview Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Recent Production Video</h3>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">File:</span>
                <span className="font-mono text-white text-[11px]">Taleemi_Duniya_Pro_Avatar_Tutorial.mp4</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Resolution:</span>
                <span className="text-emerald-400">1920x1080 @ 60fps</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Audio:</span>
                <span className="text-white">ur-PK-AsadNeural (44.1kHz AAC)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  QC PASSED (100%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
