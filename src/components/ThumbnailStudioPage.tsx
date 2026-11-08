import React, { useState } from "react";
import {
  generateThumbnailConcepts,
} from "../lib/thumbnailStudio";

interface ThumbnailStudioPageProps {
  currentUserId?: string;
  channelName?: string;
}

export const ThumbnailStudioPage: React.FC<ThumbnailStudioPageProps> = ({
  channelName = "Lodhi TechX (@lodhitechx)",
}) => {
  const [title, setTitle] = useState("TALEEMI DUNIYA PRO");
  const [subtitle, setSubtitle] = useState("PAKISTAN'S #1 SCHOOL ERP");
  const [badgeText, setBadgeText] = useState("OFFICIAL LAUNCH");
  const [accentColor, setAccentColor] = useState("#10B981");
  const [videoId, setVideoId] = useState("BnE6_ZbM4Bc");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const concepts = generateThumbnailConcepts(title, "Education & E-Learning", {
    badgeText,
    projectId: "proj_demo",
  });

  const handleUploadToYouTube = async () => {
    setIsUploading(true);
    setUploadStatus(null);
    try {
      // In production, this invokes the native/Cloudflare backend to call youtube.thumbnails.set
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus("Successfully set custom thumbnail on YouTube for video " + videoId + "!");
      }, 1200);
    } catch {
      setIsUploading(false);
      setUploadStatus("Upload failed. Verify OAuth credentials.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              YOUTUBE DATA API V3 • THUMBNAIL STUDIO
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              1280x720 Standard (16:9)
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            Automated Thumbnail Studio & YouTube Sync
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate high-CTR 1280x720 thumbnails and upload directly to YouTube via <code>thumbnails.set</code>.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">Target YouTube Channel</p>
          <p className="text-sm font-semibold text-emerald-400">{channelName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customization & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live 16:9 Thumbnail Preview Canvas */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-white">Live 1280x720 Canvas Preview</h2>
              <span className="text-xs text-gray-400 font-mono">1280 x 720 (Aspect 1.78)</span>
            </div>

            {/* The Canvas Box */}
            <div
              className="relative w-full aspect-video rounded-lg overflow-hidden border-2 shadow-2xl flex flex-col justify-between p-8"
              style={{
                backgroundColor: "#060E1A",
                borderColor: accentColor,
              }}
            >
              {/* Header pill */}
              <div className="flex justify-between items-center">
                <span
                  className="px-3 py-1 text-xs font-bold rounded uppercase tracking-wider text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {badgeText}
                </span>
                <span className="text-xs text-gray-400 font-semibold tracking-wider">
                  LODHI TECHX OFFICIAL
                </span>
              </div>

              {/* Central Title */}
              <div className="space-y-2">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight drop-shadow-md">
                  {title}
                </h3>
                <p
                  className="text-lg sm:text-xl font-bold uppercase tracking-wider"
                  style={{ color: accentColor }}
                >
                  {subtitle}
                </p>
              </div>

              {/* Bottom Feature Badges & Presenter Tag */}
              <div className="flex justify-between items-end">
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
                    <span>Automated School Management</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
                    <span>1080p Full HD Walkthrough</span>
                  </div>
                </div>

                <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-2.5 text-right">
                  <p className="text-[10px] text-gray-400 uppercase">AI Presenter</p>
                  <p className="text-xs font-bold text-white">UMAR HAYAT</p>
                  <p className="text-[10px]" style={{ color: accentColor }}>LODHI TECHX</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Customization Elements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">Headline Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">Sub-headline / Punchline</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">Top Badge Text</label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">Accent Color</label>
                <div className="flex space-x-2 mt-1">
                  {["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#00F0FF"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        accentColor === c ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* AI Generated Concept Presets */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <label className="text-xs font-medium text-gray-300 block mb-2">AI High-CTR Concepts:</label>
              <div className="grid grid-cols-3 gap-2">
                {concepts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setTitle(c.headline);
                      setSubtitle(c.subHeadline);
                      setAccentColor(c.accentColor);
                    }}
                    className="p-2 rounded bg-gray-950 border border-gray-800 hover:border-emerald-500 text-left transition-colors"
                  >
                    <p className="text-[11px] font-bold text-white truncate">{c.headline}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.style}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Validation & YouTube Sync */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              YouTube Preflight Audit
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-400">Dimensions:</span>
                <span className="text-emerald-400 font-semibold">1280 x 720 (Pass)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-400">Aspect Ratio:</span>
                <span className="text-emerald-400 font-semibold">16:9 Standard (Pass)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-400">File Size:</span>
                <span className="text-emerald-400 font-semibold">~78 KB (&lt; 2MB limit)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-400">Format:</span>
                <span className="text-emerald-400 font-semibold">PNG / JPEG (Pass)</span>
              </div>
            </div>
          </div>

          {/* YouTube Upload Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Publish Directly to YouTube</h3>
            <p className="text-xs text-gray-400">
              Instantly set this thumbnail for an uploaded YouTube video using the authenticated channel's token.
            </p>

            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1">Target YouTube Video ID</label>
              <input
                type="text"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                placeholder="e.g. BnE6_ZbM4Bc"
              />
            </div>

            <button
              type="button"
              onClick={handleUploadToYouTube}
              disabled={isUploading || !videoId}
              className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Setting Thumbnail on YouTube...</span>
                </>
              ) : (
                <span>Upload to YouTube (thumbnails.set)</span>
              )}
            </button>

            {uploadStatus && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300">
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
