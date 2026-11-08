// NovaVid AI Studio — Stage W3: Production Customer SaaS Self-Service Portal
// Creator subscription oversight, device hardware unbinding, and real-time usage telemetry.

import React, { useState } from "react";
import { TIER_PLANS, type LicenseTier } from "../lib/licensingStudio";

interface BoundDevice {
  id: string;
  fingerprint: string;
  hostname: string;
  os: string;
  lastActive: string;
  isCurrent: boolean;
}

const INITIAL_DEVICES: BoundDevice[] = [
  {
    id: "dev_1",
    fingerprint: "HW-WIN11-D4A8-771B",
    hostname: "DESKTOP-UMAR-PC",
    os: "Windows 11 Pro x64",
    lastActive: "Active Now",
    isCurrent: true,
  },
  {
    id: "dev_2",
    fingerprint: "HW-WIN10-B1C2-990E",
    hostname: "LAPTOP-STUDIO-MOBILE",
    os: "Windows 10 Home x64",
    lastActive: "3 days ago",
    isCurrent: false,
  },
];

export const CustomerSaaSPanel: React.FC = () => {
  const [currentTier, setCurrentTier] = useState<LicenseTier>("creator");
  const [devices, setDevices] = useState<BoundDevice[]>(INITIAL_DEVICES);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const plan = TIER_PLANS[currentTier];

  const handleUnbindDevice = (id: string, hostname: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setActionNotice(`Successfully released activation seat for ${hostname}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleUpgradeTier = (tier: LicenseTier) => {
    setCurrentTier(tier);
    setShowUpgradeModal(false);
    setActionNotice(`Subscription upgraded to ${TIER_PLANS[tier].displayName}!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const maxSeats = currentTier === "enterprise" ? 20 : currentTier === "pro_studio" ? 5 : 2;

  return (
    <div className="space-y-6 text-slate-100 p-1">
      {/* Customer Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/60 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-xs font-semibold tracking-wider uppercase border border-blue-500/30">
                Customer Subscription Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Subscription
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              Subscription & Multi-Device Entitlements
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage your commercial license tier, active workstation authorizations, and monthly AI generation quotas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
            >
              Change / Upgrade Plan
            </button>
            <a
              href="https://billing.novavid.studio"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
            >
              Billing & Invoices ↗
            </a>
          </div>
        </div>

        {actionNotice && (
          <div className="mt-4 p-2.5 bg-emerald-950/80 border border-emerald-600/50 rounded-lg text-emerald-200 text-xs flex items-center justify-between">
            <span>✓ {actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-emerald-400 font-bold hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Main Grid: Subscription Info + Usage Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Tier Details & Active Hardware Activations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Plan Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-medium">Active Commercial Plan</span>
                <h3 className="text-xl font-black text-white mt-0.5">{plan.displayName}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white">${plan.monthlyPriceUsd}</span>
                <span className="text-xs text-slate-400"> / month</span>
                <p className="text-[11px] text-slate-500">Renews on December 7, 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Max Resolution</span>
                <span className="text-white font-bold text-sm mt-0.5 block">{plan.maxResolution.toUpperCase()}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Watermark Policy</span>
                <span className="text-emerald-400 font-bold text-sm mt-0.5 block">
                  {plan.watermarkRequired ? "Watermarked" : "100% Commercial Clean"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">YouTube Direct Publishing</span>
                <span className="text-blue-400 font-bold text-sm mt-0.5 block">
                  {plan.canAutoPublish ? "Enabled (OAuth 2.0)" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Bound Workstation Hardware Seats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white">Authorized Workstation Devices</h3>
                <p className="text-xs text-slate-400">
                  {devices.length} of {maxSeats} allowed hardware activations in use
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                {maxSeats - devices.length} Seats Free
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`p-3.5 rounded-lg border flex items-center justify-between ${
                    device.isCurrent
                      ? "bg-indigo-950/20 border-indigo-500/40"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{device.hostname}</span>
                      {device.isCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                          THIS PC
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {device.fingerprint} • {device.os}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Last active: {device.lastActive}</div>
                  </div>

                  {!device.isCurrent && (
                    <button
                      onClick={() => handleUnbindDevice(device.id, device.hostname)}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
                    >
                      Unbind Machine
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Monthly Resource Meters (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Monthly Usage Quotas</h3>
            <p className="text-xs text-slate-400">Resets on December 7, 2026</p>
          </div>

          {/* AI Tokens Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-300">Gemini AI Text & Research Tokens</span>
              <span className="text-slate-400 font-mono">
                54,200 / {plan.aiTokenMonthlyBudget.toLocaleString()} (36%)
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: "36%" }}
              ></div>
            </div>
          </div>

          {/* Video Exports Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-300">Video Render Exports</span>
              <span className="text-slate-400 font-mono">
                8 / {plan.maxExportsMonthly} renders (26%)
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: "26%" }}
              ></div>
            </div>
          </div>

          {/* Imagen 3 Syntheses */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-300">Imagen 3 AI Visual Generations</span>
              <span className="text-slate-400 font-mono">14 / 60 assets (23%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: "23%" }}
              ></div>
            </div>
          </div>

          {/* Neural TTS Characters */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-300">Neural Voice Synthesized Characters</span>
              <span className="text-slate-400 font-mono">22,400 / 120,000 chars (18%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: "18%" }}
              ></div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-200">Offline-First Cloud Sync Status</p>
            <p className="text-[11px] text-slate-400">
              When disconnected from the internet, NovaVid continues running seamlessly using local SQLite storage. All queue changes synchronize automatically upon reconnection.
            </p>
          </div>
        </div>
      </div>

      {/* Plan Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Choose Your Commercial Plan</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["creator", "pro_studio", "enterprise"] as LicenseTier[]).map((tierKey) => {
                const p = TIER_PLANS[tierKey];
                const isSelected = currentTier === tierKey;
                return (
                  <div
                    key={tierKey}
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.displayName}</h4>
                      <p className="text-2xl font-black text-white mt-1">
                        ${p.monthlyPriceUsd}
                        <span className="text-xs text-slate-400 font-normal"> / mo</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-2">{p.description}</p>
                      <ul className="mt-3 space-y-1 text-[11px] text-slate-300">
                        {p.features.slice(0, 3).map((feat, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-emerald-400">✓</span> {feat}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleUpgradeTier(tierKey)}
                      disabled={isSelected}
                      className={`mt-4 w-full py-2 text-xs font-semibold rounded-lg transition-colors ${
                        isSelected
                          ? "bg-slate-800 text-slate-400 cursor-default"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {isSelected ? "Current Tier" : "Select Plan"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
