import { useState, useEffect } from "react";
import {
  YouTubeChannelInfo,
  PublishJobStatus,
  OAuthClientConfig,
  youtubeGetAuthUrl,
  youtubeGetCredentialStatus,
  youtubeLogout,
  youtubeGetChannels,
  youtubeStartUpload,
  youtubeListenForAuthCode,
  youtubeSaveClientConfig,
  youtubeGetClientConfig,
  youtubeCancelUpload,
  DEFAULT_CLIENT_ID,
  DEFAULT_REDIRECT_URI,
} from "../lib/publishingStudio";
import {
  PublishingRepository,
  SEORepository,
  RenderJobRepository,
} from "../lib/repositories";

interface PublishingStudioPageProps {
  currentProjectId: string | null;
  projectTitle?: string;
  onNavigateToSEO?: () => void;
  onNavigateToConnectionCenter?: () => void;
}

export function PublishingStudioPage({
  currentProjectId,
  projectTitle,
  onNavigateToSEO,
  onNavigateToConnectionCenter,
}: PublishingStudioPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [channels, setChannels] = useState<YouTubeChannelInfo[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [privacyStatus, setPrivacyStatus] = useState<"private" | "unlisted" | "public">("private");
  const [madeForKids, setMadeForKids] = useState(false);
  const [categoryId, setCategoryId] = useState("28");
  const [videoPath, setVideoPath] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<PublishJobStatus | null>(null);
  const [jobHistory, setJobHistory] = useState<PublishJobStatus[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const [customClientSecret, setCustomClientSecret] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeAuthUrl, setActiveAuthUrl] = useState<string | null>(null);

  // Load auth status, channel, client config, and SEO defaults
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const authed = await youtubeGetCredentialStatus();
        const chList = await youtubeGetChannels();
        const cfg = await youtubeGetClientConfig();

        if (isMounted) {
          setIsAuthenticated(authed);
          setChannels(chList);
          if (chList.length > 0) {
            setSelectedChannelId(chList[0].channelId);
          }
          if (cfg) {
            setCustomClientId(cfg.clientId);
            setCustomClientSecret(cfg.clientSecret || "");
          } else {
            setCustomClientId(DEFAULT_CLIENT_ID);
          }
        }

        if (currentProjectId) {
          const seo = await SEORepository.getMetadata(currentProjectId);
          if (isMounted && seo) {
            setUploadTitle(seo.selectedTitle);
            setUploadDescription(seo.description);
            setUploadTags(seo.tags);
          } else if (isMounted) {
            setUploadTitle(projectTitle || "My YouTube Production");
          }

          const renderJobs = await RenderJobRepository.listRenderJobs(currentProjectId);
          const completedJob = renderJobs.find((j: any) => j.status === "completed");
          if (isMounted && completedJob) {
            setVideoPath(completedJob.outputPath);
          } else if (isMounted) {
            setVideoPath(`exports/render_${currentProjectId}.mp4`);
          }

          const jobs = await PublishingRepository.listJobs(currentProjectId);
          if (isMounted) {
            setJobHistory(jobs);
            if (jobs.length > 0) {
              setCurrentJob(jobs[0]);
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load publishing data:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentProjectId, projectTitle]);

  const handleConnectAccount = async () => {
    try {
      setErrorMessage(null);
      setIsAuthenticating(true);
      const clientId = customClientId.trim() || DEFAULT_CLIENT_ID;
      const secret = customClientSecret.trim() ? customClientSecret.trim() : undefined;
      await youtubeSaveClientConfig({
        clientId,
        clientSecret: secret,
        redirectUri: DEFAULT_REDIRECT_URI,
      }).catch(() => {});
      const session = await youtubeGetAuthUrl(clientId, DEFAULT_REDIRECT_URI);
      setActiveAuthUrl(session.authUrl);

      setStatusMessage(
        `OAuth 2.0 PKCE Loopback listener active on port 8911. Please authorize in your browser.`
      );

      // Open in browser
      window.open(session.authUrl, "_blank");

      // Listen asynchronously for the callback
      const token = await youtubeListenForAuthCode(session);
      if (token) {
        setIsAuthenticated(true);
        setIsAuthenticating(false);
        setActiveAuthUrl(null);
        setStatusMessage("✅ YouTube Account successfully connected via OAuth 2.0 PKCE!");

        // Refresh channel list
        const updatedChannels = await youtubeGetChannels();
        setChannels(updatedChannels);
        if (updatedChannels.length > 0) {
          setSelectedChannelId(updatedChannels[0].channelId);
        }
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setActiveAuthUrl(null);
      setErrorMessage(`OAuth connection failed: ${err.message || String(err)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await youtubeLogout();
      setIsAuthenticated(false);
      const resetChannels = await youtubeGetChannels();
      setChannels(resetChannels);
      setStatusMessage("Disconnected Google YouTube credentials from Windows Credential Manager.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Logout failed: ${err.message || String(err)}`);
    }
  };

  const handleSaveClientConfig = async () => {
    try {
      const config: OAuthClientConfig = {
        clientId: customClientId.trim() || DEFAULT_CLIENT_ID,
        clientSecret: customClientSecret.trim() ? customClientSecret.trim() : undefined,
        redirectUri: DEFAULT_REDIRECT_URI,
      };
      await youtubeSaveClientConfig(config);
      setShowConfigModal(false);
      setStatusMessage("OAuth client configuration saved to Windows Credential Manager.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to save client configuration: ${err.message || String(err)}`);
    }
  };

  const handleCancelUpload = async () => {
    if (currentJob) {
      try {
        await youtubeCancelUpload(currentJob.id);
        setStatusMessage("Upload cancellation requested.");
      } catch (err: any) {
        setErrorMessage(`Cancellation failed: ${err.message || String(err)}`);
      }
    }
  };

  const handleOpenApprovalModal = () => {
    if (!currentProjectId) {
      setErrorMessage("Please select or create an active project first.");
      return;
    }
    if (!uploadTitle.trim()) {
      setErrorMessage("Video title is required.");
      return;
    }
    setApprovalConfirmed(false);
    setShowApprovalModal(true);
  };

  const handleExecuteUpload = async () => {
    setShowApprovalModal(false);
    if (!currentProjectId) return;

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage("Initializing Resumable Video Upload to YouTube Data API v3...");

    try {
      const result = await youtubeStartUpload({
        projectId: currentProjectId,
        channelId: selectedChannelId || "UC_NovaVid_Official",
        videoPath: videoPath || `exports/render_${currentProjectId}.mp4`,
        title: uploadTitle,
        description: uploadDescription,
        tags: uploadTags,
        privacyStatus,
        madeForKids,
        categoryId,
      });

      setCurrentJob(result);
      setJobHistory([result, ...jobHistory]);

      await PublishingRepository.saveJob(result, {
        projectId: currentProjectId,
        channelId: selectedChannelId || "UC_NovaVid_Official",
        videoPath,
        title: uploadTitle,
        description: uploadDescription,
        tags: uploadTags,
        privacyStatus,
        madeForKids,
        categoryId,
      });

      setStatusMessage(
        `Video upload completed! Video ID: ${result.youtubeVideoId} (Privacy: ${privacyStatus.toUpperCase()})`
      );
    } catch (err: any) {
      setErrorMessage(`Upload failed: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const activeChannel = channels.find((c) => c.channelId === selectedChannelId) || channels[0];

  return (
    <div className="publishing-studio-container" style={{ padding: "24px", color: "#e2e8f0" }}>
      {/* Studio Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid #334155",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>
              YouTube OAuth & Publishing Studio
            </h1>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "#dc2626",
                color: "#fee2e2",
              }}
            >
              Stage S
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
            Live Google OAuth 2.0 PKCE, Resumable Chunked Video Upload (videos.insert), Private-First Default, and Human Approval Gate.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onNavigateToConnectionCenter && (
            <button
              onClick={onNavigateToConnectionCenter}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #0284c7",
                background: "#0369a1",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              🌐 Google & YouTube Connection Center
            </button>
          )}
          <button
            onClick={() => setShowConfigModal(true)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #475569",
              background: "#1e293b",
              color: "#f8fafc",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ⚙️ OAuth Client Config
          </button>

          {onNavigateToSEO && (
            <button
              onClick={onNavigateToSEO}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#1e293b",
                color: "#f8fafc",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              ← Edit SEO & Chapters
            </button>
          )}

          {!isAuthenticated ? (
            <button
              onClick={handleConnectAccount}
              disabled={isAuthenticating}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: isAuthenticating ? "#475569" : "#dc2626",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                cursor: isAuthenticating ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>▶</span> {isAuthenticating ? "Connecting (Loopback)..." : "Connect YouTube Account"}
            </button>
          ) : (
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                background: "#334155",
                color: "#f8fafc",
                border: "1px solid #64748b",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Disconnect Account
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {statusMessage && (
        <div
          style={{
            background: "#064e3b",
            color: "#a7f3d0",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{statusMessage}</span>
          {activeAuthUrl && (
            <a
              href={activeAuthUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#38bdf8", textDecoration: "underline", marginLeft: "12px", fontSize: "0.8rem" }}
            >
              Reopen Browser Auth Window ↗
            </a>
          )}
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fecaca",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Connected Channel Card */}
      {activeChannel && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "16px 20px",
            border: "1px solid #334155",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {activeChannel.avatarUrl ? (
              <img
                src={activeChannel.avatarUrl}
                alt={activeChannel.title}
                style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                }}
              >
                ▶
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f8fafc" }}>
                {activeChannel.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                {activeChannel.customUrl || activeChannel.channelId} • {activeChannel.subscriberCount.toLocaleString()} subscribers •{" "}
                {activeChannel.videoCount} videos
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: isAuthenticated ? "#064e3b" : "#78350f",
                color: isAuthenticated ? "#a7f3d0" : "#fef3c7",
              }}
            >
              {isAuthenticated ? "✓ Live Authenticated (OAuth 2.0 PKCE)" : "Local Profile (Offline Mode)"}
            </span>
          </div>
        </div>
      )}

      {/* Main Split Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr", gap: "24px", alignItems: "start" }}>
        {/* Left: Video Details & Metadata */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            border: "1px solid #334155",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>
              Upload Package Configuration
            </h2>
            <span style={{ fontSize: "0.75rem", color: "#38bdf8", background: "#0c4a6e", padding: "2px 8px", borderRadius: "4px" }}>
              🔒 Private-First Enforced
            </span>
          </div>

          {/* Video File Path */}
          <div>
            <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
              Rendered Video File Path
            </label>
            <input
              type="text"
              value={videoPath}
              onChange={(e) => setVideoPath(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.85rem",
                fontFamily: "monospace",
              }}
            />
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
              YouTube Title ({uploadTitle.length}/100)
            </label>
            <input
              type="text"
              maxLength={100}
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
              Video Description & Chapters
            </label>
            <textarea
              rows={8}
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                lineHeight: "1.4",
              }}
            />
          </div>

          {/* Privacy & Compliance Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Privacy Visibility (Default: Private)
              </label>
              <select
                value={privacyStatus}
                onChange={(e) => setPrivacyStatus(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <option value="private">🔒 Private (Default & Recommended)</option>
                <option value="unlisted">🔗 Unlisted (Link Access Only)</option>
                <option value="public">🌐 Public (Immediate Release)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.85rem",
                }}
              >
                <option value="28">Science & Technology (28)</option>
                <option value="27">Education (27)</option>
                <option value="24">Entertainment (24)</option>
                <option value="22">People & Blogs (22)</option>
              </select>
            </div>
          </div>

          {/* Made for Kids COPPA */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0f172a",
              padding: "10px 14px",
              borderRadius: "6px",
            }}
          >
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f8fafc" }}>
                Made for Kids (COPPA Declaration)
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                No, this content is not directed specifically to children under 13
              </div>
            </div>
            <input
              type="checkbox"
              checked={madeForKids}
              onChange={(e) => setMadeForKids(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
          </div>

          {/* Pre-Upload Trigger Button */}
          <button
            onClick={handleOpenApprovalModal}
            disabled={isUploading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "6px",
              background: isUploading ? "#475569" : "#dc2626",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              cursor: isUploading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>🛡️</span>
            {isUploading ? "Uploading in Progress..." : "Review & Publish to YouTube"}
          </button>
        </div>

        {/* Right: Upload Queue & History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Active Job Progress */}
          {currentJob && (
            <div
              style={{
                background: "#1e293b",
                borderRadius: "8px",
                padding: "20px",
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>
                  Active Upload Status
                </h2>
                {currentJob.status === "uploading" && (
                  <button
                    onClick={handleCancelUpload}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      background: "#7f1d1d",
                      color: "#fecaca",
                      border: "none",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel Upload
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "0.85rem",
                }}
              >
                <span>
                  Status:{" "}
                  <strong
                    style={{
                      color:
                        currentJob.status === "completed"
                          ? "#34d399"
                          : currentJob.status === "failed"
                          ? "#f87171"
                          : "#38bdf8",
                    }}
                  >
                    {currentJob.status.toUpperCase()}
                  </strong>
                </span>
                <span style={{ fontWeight: 700, color: "#38bdf8" }}>
                  {Math.round(currentJob.progressPercent)}%
                </span>
              </div>

              <div style={{ width: "100%", height: "8px", background: "#0f172a", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${currentJob.progressPercent}%`,
                    height: "100%",
                    background: currentJob.status === "completed" ? "#10b981" : "#3b82f6",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              {currentJob.youtubeVideoId && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "#0f172a",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #1e3a8a",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>YouTube Video ID:</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
                    {currentJob.youtubeVideoId}
                  </div>
                  <a
                    href={`https://youtu.be/${currentJob.youtubeVideoId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      color: "#60a5fa",
                      fontSize: "0.85rem",
                      textDecoration: "underline",
                      fontWeight: 600,
                    }}
                  >
                    Open on YouTube (youtu.be/{currentJob.youtubeVideoId}) →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Upload History Table */}
          <div
            style={{
              background: "#1e293b",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid #334155",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", color: "#f8fafc" }}>
              Publishing History & Jobs
            </h2>

            {jobHistory.length === 0 ? (
              <div style={{ color: "#64748b", padding: "16px", textAlign: "center", fontSize: "0.85rem" }}>
                No previous uploads for this project.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                {jobHistory.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      background: "#0f172a",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid #334155",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f8fafc" }}>
                        Video: {job.youtubeVideoId || job.id}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {job.publishedAt
                          ? new Date(job.publishedAt).toLocaleString()
                          : "Upload Completed"}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        background: job.status === "completed" ? "#064e3b" : "#7f1d1d",
                        color: job.status === "completed" ? "#a7f3d0" : "#fecaca",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Human Approval Checkpoint Modal */}
      {showApprovalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "540px",
              width: "100%",
              border: "1px solid #475569",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "1.5rem" }}>🛡️</span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc", fontWeight: 700 }}>
                Human Approval & Publishing Verification Gate
              </h2>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "16px" }}>
              Per NovaVid Production PRD safety mandates, uploading to YouTube requires explicit creator review and verification.
            </p>

            <div style={{ background: "#0f172a", borderRadius: "8px", padding: "14px", marginBottom: "16px", fontSize: "0.85rem" }}>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Target Channel: </span>
                <strong style={{ color: "#f8fafc" }}>{activeChannel?.title}</strong>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Title: </span>
                <strong style={{ color: "#38bdf8" }}>{uploadTitle}</strong>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Privacy Setting: </span>
                <strong style={{ color: privacyStatus === "private" ? "#34d399" : "#f59e0b" }}>
                  {privacyStatus.toUpperCase()} {privacyStatus === "private" ? "(Safe / Recommended)" : "(Immediate Public Broadcast)"}
                </strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Video Source: </span>
                <code style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>{videoPath}</code>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                cursor: "pointer",
                marginBottom: "20px",
                fontSize: "0.85rem",
                color: "#f8fafc",
              }}
            >
              <input
                type="checkbox"
                checked={approvalConfirmed}
                onChange={(e) => setApprovalConfirmed(e.target.checked)}
                style={{ marginTop: "2px", width: "18px", height: "18px" }}
              />
              <span>
                I have inspected the video preview, confirmed metadata accuracy, and authorize publishing this video to YouTube Data API v3.
              </span>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowApprovalModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: "#334155",
                  color: "#f8fafc",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteUpload}
                disabled={!approvalConfirmed}
                style={{
                  padding: "8px 20px",
                  borderRadius: "6px",
                  background: approvalConfirmed ? "#dc2626" : "#475569",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  cursor: approvalConfirmed ? "pointer" : "not-allowed",
                  fontSize: "0.85rem",
                }}
              >
                🚀 Confirm & Upload Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Client Configuration Modal */}
      {showConfigModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              border: "1px solid #475569",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: "1.2rem", color: "#f8fafc", fontWeight: 700 }}>
              ⚙️ Google Cloud OAuth Client Setup
            </h2>
            <div style={{ padding: "10px", borderRadius: "8px", background: "#451a03", border: "1px solid #78350f", color: "#fde68a", fontSize: "0.75rem", marginBottom: "12px", lineHeight: 1.4 }}>
              <strong>Google Cloud Note:</strong> Application type must be <strong>Desktop app</strong> (do not choose Chrome Extension or Web app, which causes <code>401 invalid_client</code>).
            </div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.5 }}>
              Enter your own Google Cloud Console OAuth 2.0 Desktop Application Client ID and Secret, or keep the built-in NovaVid defaults.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                  Google Client ID
                </label>
                <input
                  type="text"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder={DEFAULT_CLIENT_ID}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                  Client Secret (Optional for PKCE Desktop Clients)
                </label>
                <input
                  type="password"
                  value={customClientSecret}
                  onChange={(e) => setCustomClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                  OAuth Redirect URI (Fixed Loopback)
                </label>
                <input
                  type="text"
                  readOnly
                  value={DEFAULT_REDIRECT_URI}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    background: "#0b1120",
                    color: "#64748b",
                    border: "1px solid #334155",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  background: "#334155",
                  color: "#f8fafc",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClientConfig}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
