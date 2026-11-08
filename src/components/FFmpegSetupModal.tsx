import React, { useState, useEffect, useCallback } from "react";
import {
  getFFmpegSetupInfo,
  startFFmpegDownload,
  getFFmpegSetupProgress,
  cancelFFmpegSetup,
  importLocalFFmpeg,
  FFmpegSetupInfo,
  SetupProgress,
} from "../lib/ffmpegSetup";

interface FFmpegSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete?: () => void;
}

export const FFmpegSetupModal: React.FC<FFmpegSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
}) => {
  const [info, setInfo] = useState<FFmpegSetupInfo | null>(null);
  const [activeJob, setActiveJob] = useState<SetupProgress | null>(null);
  const [customSourcePath, setCustomSourcePath] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load setup status
  const loadInfo = useCallback(async () => {
    try {
      const data = await getFFmpegSetupInfo();
      setInfo(data);
      if (data.localBinPath) {
        setCustomSourcePath(data.localBinPath);
      }
    } catch (err) {
      setErrorMsg("Failed to read FFmpeg setup information: " + String(err));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadInfo();
    }
  }, [isOpen, loadInfo]);

  // Poll progress when job is active
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (activeJob && (activeJob.status === "downloading" || activeJob.status === "verifying" || activeJob.status === "extracting")) {
      timer = setInterval(async () => {
        try {
          const progress = await getFFmpegSetupProgress(activeJob.jobId);
          setActiveJob(progress);
          if (progress.status === "completed") {
            setIsProcessing(false);
            await loadInfo();
            if (onSetupComplete) onSetupComplete();
          } else if (progress.status === "failed" || progress.status === "cancelled") {
            setIsProcessing(false);
            if (progress.errorMessage) setErrorMsg(progress.errorMessage);
          }
        } catch {
          // Ignore polling errors
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeJob, loadInfo, onSetupComplete]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const progress = await startFFmpegDownload();
      setActiveJob(progress);
      if (progress.status === "completed") {
        setIsProcessing(false);
        await loadInfo();
        if (onSetupComplete) onSetupComplete();
      }
    } catch (err) {
      setIsProcessing(false);
      setErrorMsg("Download failed: " + String(err));
    }
  };

  const handleImportLocal = async () => {
    if (!customSourcePath.trim()) {
      setErrorMsg("Please specify a valid folder containing ffmpeg.exe and ffprobe.exe");
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const progress = await importLocalFFmpeg(customSourcePath.trim());
      setActiveJob(progress);
      setIsProcessing(false);
      await loadInfo();
      if (onSetupComplete) onSetupComplete();
    } catch (err) {
      setIsProcessing(false);
      setErrorMsg("Local import failed: " + String(err));
    }
  };

  const handleCancel = async () => {
    if (activeJob) {
      await cancelFFmpegSetup(activeJob.jobId);
      setIsProcessing(false);
      setActiveJob(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>FFmpeg Engine Setup & Distribution</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700">
                  Stage Q1
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Managed installation for hardware-accelerated video rendering & audio ducking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-zinc-500 hover:text-zinc-300 text-lg px-2 py-1 rounded transition disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Alert Banner */}
          <div
            className={`p-3.5 rounded-lg border flex items-start gap-3 ${
              info?.isInstalled
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                : "bg-amber-950/40 border-amber-800 text-amber-200"
            }`}
          >
            <span className="text-lg">{info?.isInstalled ? "✅" : "⚠️"}</span>
            <div className="flex-1">
              <div className="font-semibold text-xs">
                {info?.isInstalled ? "FFmpeg Engine Ready" : "FFmpeg Engine Missing / Offline"}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {info?.isInstalled
                  ? `Active Binary: ${info.currentFfmpegPath}`
                  : "NovaVid AI requires FFmpeg to render 1080p60 timeline videos, apply Ken Burns transitions, and process ducked audio mixes."}
              </div>
              {info?.currentVersion && (
                <div className="font-mono text-[10px] mt-1 text-zinc-400 bg-zinc-950/60 p-1 rounded inline-block">
                  {info.currentVersion.split(" Copyright")[0]}
                </div>
              )}
            </div>
          </div>

          {/* Licensing & Security Notice */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
            <div className="text-zinc-300 font-medium flex items-center gap-1.5">
              <span>🛡️ Security & Open-Source Compliance</span>
            </div>
            <p className="text-[11px]">
              FFmpeg is distributed under the <strong>GNU General Public License v3 (GPLv3)</strong>. To keep the application installer lightweight and preserve user privacy, NovaVid downloads or links FFmpeg as an independent tool stored in your managed application folder:
            </p>
            <code className="block font-mono text-[10px] text-zinc-500 bg-zinc-900 p-1.5 rounded truncate">
              {info?.managedBinDir}
            </code>
          </div>

          {/* Active Job Progress View */}
          {activeJob && (
            <div className="bg-blue-950/30 border border-blue-800/60 p-4 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-300 capitalize flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  {activeJob.status}...
                </span>
                <span className="font-mono text-zinc-400">{Math.round(activeJob.progressPercent)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, activeJob.progressPercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-300">{activeJob.message}</p>
              {isProcessing && (
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 transition"
                >
                  Cancel Operation
                </button>
              )}
            </div>
          )}

          {/* Setup Actions Grid */}
          {!activeJob && (
            <div className="space-y-4">
              {/* Option 1: Fast One-Click Download */}
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-xs flex items-center gap-1.5">
                      <span>1. Secure One-Click Setup (Recommended)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Official Release
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Automatically downloads and verifies the official Gyan.dev / BtbN release with SHA-256 integrity validation.
                    </p>
                  </div>
                  <button
                    onClick={handleStartDownload}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition disabled:opacity-50"
                  >
                    Start Setup
                  </button>
                </div>
              </div>

              {/* Option 2: Local Bin Import (Offline Support) */}
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <span>2. Offline / Local Binaries Import</span>
                    {info?.localBinDetected && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        Local Detected
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Have FFmpeg already on your computer or a USB drive? Specify the directory containing <code>ffmpeg.exe</code> and <code>ffprobe.exe</code> to import instantly without downloading.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSourcePath}
                    onChange={(e) => setCustomSourcePath(e.target.value)}
                    placeholder="e.g. G:\Nova Vid\bin or C:\ffmpeg\bin"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleImportLocal}
                    disabled={isProcessing || !customSourcePath.trim()}
                    className="px-3.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs transition disabled:opacity-50"
                  >
                    Import Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-200 text-xs flex justify-between items-center">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 ml-2">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center text-xs">
          <span className="text-zinc-500">
            {info?.isInstalled ? "FFmpeg ready for 1080p60 exports" : "Setup takes ~15-30 seconds"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
          >
            {info?.isInstalled ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
