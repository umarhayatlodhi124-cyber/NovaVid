import React, { useState } from "react";
import { NICHE_CATALOG } from "../lib/automation";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (settings: {
    nicheId: string;
    subNiche: string;
    dailyShorts: number;
    dailyLong: number;
    language: string;
  }) => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedNicheId, setSelectedNicheId] = useState("technology");
  const [selectedSubNiche, setSelectedSubNiche] = useState("AI News & Emerging Tools");
  const [dailyShorts, setDailyShorts] = useState(3);
  const [dailyLong, setDailyLong] = useState(3);
  const [language, setLanguage] = useState("Urdu");

  if (!isOpen) return null;

  const currentNiche = NICHE_CATALOG.find((n) => n.id === selectedNicheId) || NICHE_CATALOG[0];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({
        nicheId: selectedNicheId,
        subNiche: selectedSubNiche,
        dailyShorts,
        dailyLong,
        language,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-gray-900 border-b border-gray-800 p-6 flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                STEP {currentStep} OF 4
              </span>
              <span className="text-xs text-gray-400">NOVAVID AI STUDIO 2.0</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Creator Onboarding Wizard</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm p-2 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Select Your YouTube Channel Niche</h3>
              <p className="text-xs text-gray-400">
                NovaVid supports any niche. Select your primary category to tailor topic research and styles.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                {NICHE_CATALOG.map((niche) => (
                  <button
                    key={niche.id}
                    type="button"
                    onClick={() => {
                      setSelectedNicheId(niche.id);
                      setSelectedSubNiche(niche.subNiches[0]);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedNicheId === niche.id
                        ? "bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500"
                        : "bg-gray-950 border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    <p className="font-semibold text-white text-xs">{niche.name}</p>
                    <p className="text-[10px] text-emerald-400 font-urdu mt-0.5">{niche.nameUrdu}</p>
                  </button>
                ))}
              </div>

              {currentNiche && (
                <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                  <label className="text-xs font-medium text-gray-300 block mb-1">
                    Select Sub-Niche:
                  </label>
                  <select
                    value={selectedSubNiche}
                    onChange={(e) => setSelectedSubNiche(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {currentNiche.subNiches.map((sn) => (
                      <option key={sn} value={sn}>
                        {sn}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Daily Video Automation Target</h3>
              <p className="text-xs text-gray-400">
                Configure how many videos NovaVid creates autonomously each day for your channel.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase">YouTube Shorts (9:16)</span>
                  <p className="text-2xl font-black text-white">{dailyShorts} per day</p>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={dailyShorts}
                    onChange={(e) => setDailyShorts(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400">Recommended: 3 to 5 shorts</p>
                </div>

                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-blue-400 uppercase">Long Videos (16:9)</span>
                  <p className="text-2xl font-black text-white">{dailyLong} per day</p>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={dailyLong}
                    onChange={(e) => setDailyLong(parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <p className="text-[11px] text-gray-400">Recommended: 2 to 3 long videos</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
                Daily Production Target: <strong>{dailyShorts + dailyLong} total videos/day</strong>. Fully automated schedule.
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Language & Voice Preferences</h3>
              <p className="text-xs text-gray-400">
                Select your primary voice narration language and neural model.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "Urdu", label: "اردو (Urdu)", voice: "ur-PK-AsadNeural" },
                  { id: "English", label: "English", voice: "en-US-GuyNeural" },
                  { id: "Hindi", label: "हिन्दी (Hindi)", voice: "hi-IN-MadhurNeural" },
                  { id: "Arabic", label: "العربية (Arabic)", voice: "ar-SA-HamedNeural" },
                  { id: "Spanish", label: "Español", voice: "es-ES-AlvaroNeural" },
                  { id: "French", label: "Français", voice: "fr-FR-HenriNeural" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguage(item.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      language === item.id
                        ? "bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500"
                        : "bg-gray-950 border-gray-800 hover:bg-gray-800"
                    }`}
                  >
                    <p className="font-semibold text-white text-xs">{item.label}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">{item.voice}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Review & Start Daily Automation</h3>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Target Niche:</span>
                  <span className="font-semibold text-white">{currentNiche.name} ({selectedSubNiche})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Daily Quota:</span>
                  <span className="font-semibold text-emerald-400">{dailyShorts} Shorts + {dailyLong} Long ({dailyShorts + dailyLong} total)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Language / Voice:</span>
                  <span className="font-semibold text-white">{language} Neural Engine</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Tenant Isolation:</span>
                  <span className="font-semibold text-emerald-400">Isolated Cloud Firestore & DPAPI</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-950 border-t border-gray-800 p-4 flex justify-between items-center">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(currentStep - 1)}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-xs font-semibold text-gray-300"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
          >
            {currentStep === 4 ? "Launch Daily Automation" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};
