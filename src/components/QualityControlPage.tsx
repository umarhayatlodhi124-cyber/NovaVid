import React, { useState } from "react";
import {
  type VideoQCReport,
  type QCInspectionInput,
  inspectVideoQuality,
} from "../lib/qualityControl";

interface QualityControlPageProps {
  currentUserId?: string;
  projectId?: string;
}

export const QualityControlPage: React.FC<QualityControlPageProps> = ({
  projectId = "taleemi_duniya_pro_01",
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const sampleInput: QCInspectionInput = {
    projectId,
    videoPath: "exports/Taleemi_Duniya_Pro_Avatar_Tutorial.mp4",
    durationSeconds: 65.9,
    width: 1920,
    height: 1080,
    fps: 60.0,
    videoCodec: "h264",
    audioCodec: "aac",
    audioSampleRate: 44100,
    audioBitrateKbps: 192,
    hasBlackFrames: false,
    hasAudioClipping: false,
    hasProlongedSilence: false,
    subtitlesFilePath: "exports/taleemi_duniya_subtitles.srt",
    subtitlesCount: 5,
    thumbnailFilePath: "exports/Taleemi_Duniya_Pro_Avatar_Thumbnail.png",
    thumbnailWidth: 1280,
    thumbnailHeight: 720,
    thumbnailSizeKb: 78.5,
    title: "Taleemi Duniya Pro - Complete Educational ERP Software Tutorial (Urdu/English)",
    description: "Welcome to Taleemi Duniya Pro, Pakistan's leading digital campus management and academic ERP software. Watch the official full walkthrough presented by Umar Hayat, Founder LODHI TECHX.",
    tagsCount: 14,
  };

  const report: VideoQCReport = inspectVideoQuality(sampleInput);

  const filteredChecks = report.checks.filter((c) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "passed") return c.status === "pass";
    if (selectedFilter === "warning") return c.status === "warning";
    if (selectedFilter === "failed") return c.status === "fail";
    return c.category === selectedFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              PREFLIGHT QUALITY AUDIT
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
              14 Automated Verification Checks
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            Quality Control & Preflight Inspector
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Comprehensive automated audio, video, subtitle, thumbnail, and SEO checks before publication.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-right">
            <p className="text-xs text-gray-400">Preflight Score</p>
            <p className="text-2xl font-black text-emerald-400">{report.scorePercent}%</p>
          </div>
          <div
            className={`px-4 py-3 rounded-lg font-bold text-sm border flex items-center space-x-2 ${
              report.canPublish
                ? "bg-emerald-950/40 border-emerald-500 text-emerald-400"
                : "bg-red-950/40 border-red-500 text-red-400"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>{report.canPublish ? "READY TO PUBLISH" : "PUBLICATION BLOCKED"}</span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Total Checks</p>
          <p className="text-2xl font-bold text-white mt-1">{report.totalChecks}</p>
        </div>
        <div className="bg-gray-900 border border-emerald-900/50 rounded-xl p-4">
          <p className="text-xs text-emerald-400">Passed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{report.passedCount}</p>
        </div>
        <div className="bg-gray-900 border border-amber-900/50 rounded-xl p-4">
          <p className="text-xs text-amber-400">Warnings</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{report.warningCount}</p>
        </div>
        <div className="bg-gray-900 border border-red-900/50 rounded-xl p-4">
          <p className="text-xs text-red-400">Failed / Critical</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{report.failedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-3 overflow-x-auto">
        {[
          { id: "all", label: "All Checks" },
          { id: "video", label: "Video Standards" },
          { id: "audio", label: "Audio Dynamics" },
          { id: "subtitles", label: "Subtitles" },
          { id: "thumbnail", label: "Thumbnail Standards" },
          { id: "metadata", label: "YouTube SEO Metadata" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedFilter === tab.id
                ? "bg-emerald-600 text-white"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Checks Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-950 text-xs uppercase text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Check Name</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Severity</th>
              <th className="px-6 py-3">Details / Measured Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredChecks.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                      item.status === "pass"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : item.status === "warning"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold text-white">{item.name}</td>
                <td className="px-6 py-4 capitalize text-gray-400">{item.category}</td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs uppercase font-medium ${
                      item.severity === "critical"
                        ? "text-red-400"
                        : item.severity === "warning"
                        ? "text-amber-400"
                        : "text-blue-400"
                    }`}
                  >
                    {item.severity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-200">{item.message}</p>
                  {item.measuredValue && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Measured: <span className="text-gray-300 font-mono">{item.measuredValue}</span> | Expected: <span className="text-gray-300 font-mono">{item.expectedValue}</span>
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
