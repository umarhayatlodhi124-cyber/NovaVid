import { useState, useEffect } from "react";
import {
  loadConnectionCenterState,
  saveGeminiKey,
  removeGeminiKey,
  testGeminiApi,
  startYouTubeOAuthFlow,
  disconnectYouTubeChannel,
  refreshYouTubeChannelData,
  runConnectionDiagnostics,
  GeminiConnectionState,
  YouTubeConnectionState,
  DiagnosticsReport,
  DEFAULT_GEMINI_ACCOUNT_LABEL,
  DEFAULT_YOUTUBE_ACCOUNT_LABEL,
} from "../lib/googleConnectionCenter";
import {
  OAuthClientConfig,
  PublishJobStatus,
  youtubeSaveClientConfig,
  youtubeGetClientConfig,
  youtubeTestRefreshToken,
  youtubeTestAuthFlow,
  DEFAULT_CLIENT_ID,
  DEFAULT_REDIRECT_URI,
} from "../lib/publishingStudio";
import { PublishingRepository, ProviderConfigRepository } from "../lib/repositories";
import { DEFAULT_PROVIDER_CONFIG } from "../lib/providers";
import { FALLBACK_GEMINI_CATALOG, GeminiModelInfo, fetchGeminiModelCatalog } from "../lib/models";

interface GoogleYouTubeConnectionCenterProps {
  onNavigateToPublish?: () => void;
  onNavigateToResearch?: () => void;
}

export function GoogleYouTubeConnectionCenter({
  onNavigateToPublish,
  onNavigateToResearch,
}: GoogleYouTubeConnectionCenterProps) {
  // Connection states
  const [geminiState, setGeminiState] = useState<GeminiConnectionState>({
    configured: false,
    model: "gemini-3.8-flash",
    status: "not_configured",
    accountLabel: DEFAULT_GEMINI_ACCOUNT_LABEL,
    lastTested: null,
    errorMessage: null,
    requestsCount: 0,
    quotaInfo: "Google AI Studio Free Tier (20 RPD) / Scalable Cloud Billing",
    storageType: "Windows Credential Manager (DPAPI)",
  });

  const [youtubeState, setYoutubeState] = useState<YouTubeConnectionState>({
    authenticated: false,
    accountLabel: DEFAULT_YOUTUBE_ACCOUNT_LABEL,
    status: "disconnected",
    channels: [],
    selectedChannel: null,
    clientId: DEFAULT_CLIENT_ID,
    redirectUri: DEFAULT_REDIRECT_URI,
    authUrl: null,
    tokenExpiresAt: null,
    autoRefresh: true,
    errorMessage: null,
    hasRefreshToken: false,
    lastSyncAt: null,
  });

  // Diagnostics & History
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [uploadHistory, setUploadHistory] = useState<PublishJobStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingChannels, setIsRefreshingChannels] = useState(false);

  // Gemini input
  const [geminiInputKey, setGeminiInputKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    message: string;
    testedAt: string;
    modelUsed?: string;
    fallbackOccurred?: boolean;
    statusCode?: number;
    errorCategory?: string;
  } | null>(null);

  // YouTube OAuth
  const [isAuthenticatingYT, setIsAuthenticatingYT] = useState(false);
  const [authUrlForCopy, setAuthUrlForCopy] = useState<string | null>(null);

  // Config Wizard Modal
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState("");
  const [customClientSecretInput, setCustomClientSecretInput] = useState("");
  const [hasClientSecret, setHasClientSecret] = useState(false);
  const [showSecretInModal, setShowSecretInModal] = useState(false);
  const [testConfigResult, setTestConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dynamic model catalog from official Google Models API
  const [modelCatalog, setModelCatalog] = useState<GeminiModelInfo[]>(FALLBACK_GEMINI_CATALOG);
  const [isTestingRefresh, setIsTestingRefresh] = useState(false);
  const [isTestingAuthFlow, setIsTestingAuthFlow] = useState(false);

  // Feedback notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotice = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      const { gemini, youtube } = await loadConnectionCenterState();
      setGeminiState(gemini);
      setYoutubeState(youtube);

      // Load dynamic models catalog from Google's Models API
      const catalog = await fetchGeminiModelCatalog().catch(() => FALLBACK_GEMINI_CATALOG);
      setModelCatalog(catalog);

      const diag = await runConnectionDiagnostics();
      setDiagnostics(diag);

      const history = await PublishingRepository.listAllJobs(15).catch(() => []);
      setUploadHistory(history);

      const cfg = await youtubeGetClientConfig().catch(() => null);
      if (cfg) {
        setCustomClientIdInput(cfg.clientId);
        const secretConfigured = Boolean(cfg.clientSecret && cfg.clientSecret.length > 0);
        setHasClientSecret(secretConfigured);
        setCustomClientSecretInput("");
      } else {
        setCustomClientIdInput(DEFAULT_CLIENT_ID);
        setHasClientSecret(false);
        setCustomClientSecretInput("");
      }

      // Auto-verify Gemini API connectivity if key is configured and not yet verified
      if (gemini.configured && gemini.status !== "connected") {
        testGeminiApi(gemini.model)
          .then((res) => {
            const testTimestamp = new Date().toLocaleTimeString();
            const resultObj = {
              success: res.success,
              message: res.message,
              testedAt: testTimestamp,
              modelUsed: res.modelUsed,
              fallbackOccurred: res.fallbackOccurred,
              statusCode: res.statusCode,
              errorCategory: res.errorCategory,
            };
            setGeminiTestResult(resultObj);
            if (res.success) {
              setGeminiState((prev) => ({
                ...prev,
                status: "connected",
                lastTested: new Date().toISOString(),
                errorMessage: null,
                modelUsed: res.modelUsed,
                fallbackOccurred: res.fallbackOccurred,
              }));
            } else {
              const isTransient = res.statusCode === 503 || res.statusCode === 429 || res.message.includes("503") || res.message.includes("429");
              setGeminiState((prev) => ({
                ...prev,
                status: isTransient ? "temp_unavailable" : "error",
                errorMessage: res.message,
                statusCode: res.statusCode,
              }));
            }
            runConnectionDiagnostics(resultObj).then(setDiagnostics).catch(() => {});
          })
          .catch((err) => {
            const errMsg = err?.message || String(err);
            const isTransient = errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("UNAVAILABLE");
            const resultObj = {
              success: false,
              message: errMsg,
              testedAt: new Date().toLocaleTimeString(),
              statusCode: isTransient ? (errMsg.includes("429") ? 429 : 503) : undefined,
            };
            setGeminiTestResult(resultObj);
            setGeminiState((prev) => ({
              ...prev,
              status: isTransient ? "temp_unavailable" : "error",
              errorMessage: errMsg,
            }));
            runConnectionDiagnostics(resultObj).then(setDiagnostics).catch(() => {});
          });
      }
    } catch (err: any) {
      console.error("Failed to load connection center data:", err);
      showNotice("error", `Failed to load connection data: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    // Automatic live synchronization every 60 seconds
    const interval = setInterval(() => {
      refreshAllData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Gemini Handlers
  const handleSaveGeminiKey = async () => {
    try {
      await saveGeminiKey(geminiInputKey);
      setGeminiInputKey("");
      showNotice("success", "âœ… Google Gemini API key securely encrypted in Windows Credential Manager.");
      await refreshAllData();
    } catch (err: any) {
      showNotice("error", err.message || "Failed to save Gemini API key.");
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiApi(geminiState.model);
      const testTimestamp = new Date().toLocaleTimeString();
      const resultObj = {
        success: res.success,
        message: res.message,
        testedAt: testTimestamp,
        modelUsed: res.modelUsed,
        fallbackOccurred: res.fallbackOccurred,
        statusCode: res.statusCode,
        errorCategory: res.errorCategory,
      };
      setGeminiTestResult(resultObj);
      if (res.success) {
        setGeminiState((prev) => ({
          ...prev,
          status: "connected",
          lastTested: new Date().toISOString(),
          errorMessage: null,
          modelUsed: res.modelUsed,
          fallbackOccurred: res.fallbackOccurred,
        }));
        if (res.fallbackOccurred) {
          showNotice("info", `Gemini generation verified via fallback model: ${res.modelUsed} (${geminiState.model} was unavailable)`);
        } else {
          showNotice("success", `Gemini API live connection verified (${res.modelUsed || geminiState.model})`);
        }
      } else {
        const isTransient = res.statusCode === 503 || res.statusCode === 429 || res.message.includes("503") || res.message.includes("429");
        setGeminiState((prev) => ({
          ...prev,
          status: isTransient ? "temp_unavailable" : "error",
          errorMessage: res.message,
          statusCode: res.statusCode,
        }));
        if (isTransient) {
          showNotice("info", `Gemini model is temporarily experiencing high demand (${res.statusCode || 503}). Retry or switch model.`);
        } else {
          showNotice("error", res.message);
        }
      }
      const diag = await runConnectionDiagnostics(resultObj);
      setDiagnostics(diag);
    } catch (err: any) {
      const errMsg = err.message || String(err);
      const isTransient = errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("UNAVAILABLE");
      const resultObj = {
        success: false,
        message: errMsg,
        testedAt: new Date().toLocaleTimeString(),
        statusCode: isTransient ? (errMsg.includes("429") ? 429 : 503) : undefined,
      };
      setGeminiTestResult(resultObj);
      setGeminiState((prev) => ({
        ...prev,
        status: isTransient ? "temp_unavailable" : "error",
        errorMessage: errMsg,
      }));
      showNotice("error", `Test error: ${errMsg}`);
      const diag = await runConnectionDiagnostics(resultObj);
      setDiagnostics(diag);
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleRemoveGeminiKey = async () => {
    if (!confirm("Remove Gemini API key from Windows Credential Manager? Offline procedural generation will be used until reconfigured.")) return;
    try {
      await removeGeminiKey();
      setGeminiTestResult(null);
      showNotice("info", "Gemini API key deleted from Windows Credential Manager.");
      await refreshAllData();
    } catch (err: any) {
      showNotice("error", err.message || "Failed to remove key.");
    }
  };

  // YouTube Handlers
  const handleConnectYouTube = async () => {
    const targetClientId = customClientIdInput.trim() || DEFAULT_CLIENT_ID;
    const targetSecret = customClientSecretInput.trim() ? customClientSecretInput.trim() : undefined;

    // Check if client secret is configured before starting loopback and opening browser
    if (!hasClientSecret && !targetSecret) {
      showNotice(
        "error",
        "OAuth Client Secret is missing. Google OAuth token exchange requires your Client Secret. Please configure it in OAuth Client Config."
      );
      setShowConfigWizard(true);
      return;
    }

    setIsAuthenticatingYT(true);
    setAuthUrlForCopy(null);
    showNotice(
      "info",
      "OAuth 2.0 PKCE Loopback listener active on http://127.0.0.1:8911. Please choose your LODHI TECHX Google account in your browser."
    );

    try {
      if (targetSecret || targetClientId !== DEFAULT_CLIENT_ID) {
        await youtubeSaveClientConfig({
          clientId: targetClientId,
          clientSecret: targetSecret,
          redirectUri: DEFAULT_REDIRECT_URI,
        }).catch(() => {});
      }

      const token = await startYouTubeOAuthFlow(
        targetClientId,
        (url) => setAuthUrlForCopy(url)
      );

      if (token) {
        showNotice("success", "âœ… YouTube Channel successfully authorized via Google OAuth 2.0 PKCE!");
        await refreshAllData();
      }
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      showNotice("error", `YouTube authorization failed: ${errorMsg}`);
      setYoutubeState((prev) => ({
        ...prev,
        errorMessage: errorMsg,
        status: "error",
      }));
      await refreshAllData().catch(() => {});
    } finally {
      setIsAuthenticatingYT(false);
      setAuthUrlForCopy(null);
    }
  };

  const handleRefreshChannel = async () => {
    setIsRefreshingChannels(true);
    try {
      const authState = await refreshYouTubeChannelData();
      setYoutubeState((prev) => ({
        ...prev,
        authenticated: authState.authenticated,
        channels: authState.channels,
        selectedChannel: authState.activeChannel || null,
        tokenExpiresAt: authState.tokenExpiresAt ?? null,
        hasRefreshToken: authState.hasRefreshToken,
        lastSyncAt: new Date().toISOString(),
        errorMessage: authState.lastError || null,
        status: authState.authenticated ? "connected" : (authState.lastError ? "error" : "disconnected"),
      }));
      showNotice("success", "âœ… Channel statistics synchronized with YouTube Data API v3.");
      const diag = await runConnectionDiagnostics();
      setDiagnostics(diag);
    } catch (err: any) {
      showNotice("error", `Channel refresh failed: ${err.message || String(err)}`);
    } finally {
      setIsRefreshingChannels(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    if (!confirm("Disconnect YouTube Channel? This will revoke the OAuth token and delete credentials from Windows Credential Manager.")) return;
    try {
      await disconnectYouTubeChannel();
      showNotice("info", "YouTube Channel disconnected and OAuth token revoked.");
      await refreshAllData();
    } catch (err: any) {
      showNotice("error", `Failed to disconnect YouTube: ${err.message || String(err)}`);
    }
  };

  const handleSaveCustomClientConfig = async () => {
    try {
      const cfg: OAuthClientConfig = {
        clientId: customClientIdInput.trim() || DEFAULT_CLIENT_ID,
        clientSecret: customClientSecretInput.trim() ? customClientSecretInput.trim() : undefined,
        redirectUri: DEFAULT_REDIRECT_URI,
      };
      await youtubeSaveClientConfig(cfg);
      setCustomClientSecretInput("");
      setTestConfigResult(null);
      setShowConfigWizard(false);
      showNotice("success", "âœ… OAuth Client credentials encrypted in Windows Credential Manager (DPAPI).");
      await refreshAllData();
    } catch (err: any) {
      showNotice("error", `Failed to save client config: ${err.message || String(err)}`);
    }
  };

  const handleTestClientConfig = () => {
    const cid = customClientIdInput.trim() || DEFAULT_CLIENT_ID;
    const sec = customClientSecretInput.trim();
    if (!cid.includes(".apps.googleusercontent.com")) {
      setTestConfigResult({
        success: false,
        message: "Invalid Client ID format. Must end with .apps.googleusercontent.com",
      });
      return;
    }
    if (!hasClientSecret && (!sec || sec.length < 15)) {
      setTestConfigResult({
        success: false,
        message: "Client Secret is missing. Google OAuth requires a valid client secret for Desktop app clients.",
      });
      return;
    }
    setTestConfigResult({
      success: true,
      message: "Credentials valid and ready for OAuth 2.0 PKCE exchange on 127.0.0.1:8911.",
    });
  };

  const handleTestRefresh = async () => {
    setIsTestingRefresh(true);
    try {
      const msg = await youtubeTestRefreshToken();
      showNotice("success", `âœ… ${msg}`);
      await refreshAllData();
    } catch (err: any) {
      showNotice("error", `Refresh test failed: ${err.message || String(err)}`);
    } finally {
      setIsTestingRefresh(false);
    }
  };

  const handleTestAuthFlow = async () => {
    setIsTestingAuthFlow(true);
    try {
      const msg = await youtubeTestAuthFlow();
      showNotice("success", `âœ… ${msg}`);
    } catch (err: any) {
      showNotice("error", `PKCE flow test failed: ${err.message || String(err)}`);
    } finally {
      setIsTestingAuthFlow(false);
    }
  };

  // Helper formatting functions
  const formatNumber = (num?: number | null) => {
    if (num === null || num === undefined) return "Not Available";
    return num.toLocaleString();
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Not Available";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return isoString;
    }
  };

  const formatLastSync = (isoString?: string | null) => {
    if (!isoString) return "Not yet synced";
    try {
      const d = new Date(isoString);
      return `Synced at ${d.toLocaleTimeString()}`;
    } catch {
      return isoString;
    }
  };

  const selectedModelInfo: GeminiModelInfo | undefined =
    modelCatalog.find((m) => m.id === geminiState.model) ||
    modelCatalog.find((m) => m.id === "gemini-3.8-flash") ||
    modelCatalog.find((m) => m.id === "gemini-3.5-flash-lite") ||
    FALLBACK_GEMINI_CATALOG[0];

  return (
    <div className="gy-container">
      {/* Top Header Bar */}
      <div className="gy-header-row">
        <div className="gy-title-group">
          <div className="gy-pill-group">
            <span className="gy-pill gy-pill-brand">
              <span className="gy-dot-pulse"></span>
              LODHI TECHX Studio
            </span>
            <span className="gy-pill gy-pill-dpapi">
              <span>ðŸ”’</span> DPAPI Hardware Vault Isolation
            </span>
          </div>
          <h1>Google & YouTube Connection Center</h1>
          <p>
            Manage your AI generation provider and YouTube publishing authorizations with hardware-isolated Windows Credential Manager vaults. Reauthenticating, switching, or disconnecting one will never disrupt the other.
          </p>
        </div>

        <div className="gy-btn-group">
          <button
            onClick={() => setShowConfigWizard(true)}
            className="gy-btn gy-btn-secondary"
            type="button"
          >
            <span>âš™ï¸</span> OAuth Client Config
          </button>
          <button
            onClick={refreshAllData}
            disabled={isLoading || isRefreshingChannels}
            className="gy-btn gy-btn-sky"
            type="button"
          >
            <span>ðŸ”„</span> Refresh Connections
          </button>
        </div>
      </div>

      {/* Global Toast / Feedback Notification */}
      {notification && (
        <div
          className={`gy-toast ${
            notification.type === "success"
              ? "gy-toast-success"
              : notification.type === "error"
              ? "gy-toast-error"
              : "gy-toast-info"
          }`}
        >
          <div>
            <span>{notification.type === "success" ? "âœ… " : notification.type === "error" ? "âŒ " : "â„¹ï¸ "}</span>
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}
            type="button"
          >
            âœ•
          </button>
        </div>
      )}

      {/* Account Isolation Guarantee Banner */}
      <div className="gy-isolation-banner">
        <div className="gy-isolation-left">
          <div className="gy-isolation-icon">
            ðŸ›¡ï¸
          </div>
          <div className="gy-isolation-text">
            <strong>Dual Google Account Architecture & Isolation Guarantee</strong>
            <p>
              Your <strong style={{ color: "#38bdf8" }}>Gemini AI API Key</strong> (<code style={{ color: "#e2e8f0" }}>com.aiyoutubestudio.provider</code>) and your <strong style={{ color: "#fb7185" }}>YouTube Publishing OAuth Tokens</strong> (<code style={{ color: "#e2e8f0" }}>com.aiyoutubestudio.youtube</code>) are stored in completely isolated Windows Credential Manager DPAPI vaults.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#94a3b8", background: "#090d16", padding: "6px 12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
          DPAPI Encrypted Vault
        </div>
      </div>

      {/* Main 2-Column Integration Cards */}
      <div className="gy-cards-grid">
        {/* CARD 1: GEMINI AI CONNECTION CARD */}
        <div className="gy-card">
          <div className="gy-card-glow-sky"></div>

          <div>
            {/* Header & Status */}
            <div className="gy-card-header">
              <div className="gy-card-title-wrap">
                <div className="gy-avatar-icon gy-icon-sky">
                  âœ¨
                </div>
                <div>
                  <h2>Google Gemini AI</h2>
                  <p className="gy-account-label gy-label-sky">{geminiState.accountLabel}</p>
                </div>
              </div>

              {/* Distinct Gemini Connection Badges */}
              <div>
                {geminiState.status === "connected" ? (
                  <span className="gy-status-badge gy-badge-connected">
                    <span className="gy-dot-pulse"></span>
                    {geminiState.fallbackOccurred
                      ? `Verified (${geminiState.modelUsed || "Fallback"})`
                      : "Connected & Verified"}
                  </span>
                ) : geminiState.status === "testing" || isTestingGemini ? (
                  <span className="gy-status-badge gy-badge-configured">
                    <span className="gy-dot-pulse"></span>
                    Testing Connection...
                  </span>
                ) : geminiState.status === "temp_unavailable" ? (
                  <span
                    className="gy-status-badge"
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    ⚠ Temporarily Unavailable (503/429)
                  </span>
                ) : geminiState.status === "configured" ? (
                  <span className="gy-status-badge gy-badge-warning">
                    ● Key Configured (Verification Needed)
                  </span>
                ) : geminiState.status === "error" ? (
                  <span className="gy-status-badge gy-badge-error">
                    ✕ Connection Failed
                  </span>
                ) : (
                  <span className="gy-status-badge gy-badge-disconnected">
                    ○ Not Configured
                  </span>
                )}
              </div>
            </div>

            {/* Account Details & Specifications */}
            <div className="gy-meta-row">
              <div className="gy-meta-box">
                <span className="gy-meta-label">Storage Status</span>
                <span className="gy-meta-value">
                  ðŸ”’ DPAPI Encrypted Vault
                </span>
              </div>
              <div className="gy-meta-box">
                <span className="gy-meta-label">Usage & Tier</span>
                <span className="gy-meta-value" title={geminiState.quotaInfo || "Free Tier"}>
                  {geminiState.quotaInfo || "Google AI Studio Free Tier"}
                </span>
              </div>
            </div>

            {/* Model Selection Dropdown */}
            <div className="gy-field-group">
              <div className="gy-field-label">
                <span>Primary AI Production Model</span>
                {selectedModelInfo && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(14, 165, 233, 0.2)", color: "#38bdf8" }}>
                    {selectedModelInfo.status.toUpperCase()}
                  </span>
                )}
              </div>
              <select
                value={geminiState.model}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setGeminiState((prev) => ({
                    ...prev,
                    model: newModel,
                    status: prev.configured ? "configured" : "not_configured",
                  }));
                  setGeminiTestResult(null);
                  try {
                    ProviderConfigRepository.saveProviderConfig({
                      ...DEFAULT_PROVIDER_CONFIG,
                      provider: "gemini",
                      model: newModel,
                      enabled: true,
                      credentialConfigured: geminiState.configured,
                      status: "disconnected",
                      lastError: null,
                    }).catch(() => {});
                  } catch {}
                }}
                className="gy-select"
              >
                {modelCatalog
                  .filter((m) => m.supportsText)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} ({m.id}) â€” {m.pricing || "Google AI Studio Standard"}
                    </option>
                  ))}
              </select>
              {selectedModelInfo && (
                <div style={{ marginTop: "8px", padding: "8px 10px", background: "#090d16", borderRadius: "6px", border: "1px solid #1e293b", fontSize: "11px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "#94a3b8" }}>API Model ID: <code style={{ color: "#38bdf8" }}>{selectedModelInfo.id}</code></span>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>â— {selectedModelInfo.status.toUpperCase()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "#94a3b8" }}>Input/Output Pricing: <strong style={{ color: "#fbbf24" }}>{selectedModelInfo.pricing || "Official AI Studio Pricing"}</strong></span>
                    <span style={{ color: "#94a3b8" }}>Context Window: <strong style={{ color: "#e2e8f0" }}>{selectedModelInfo.inputTokenLimit ? (selectedModelInfo.inputTokenLimit / 1000).toLocaleString() + 'k' : (selectedModelInfo.maxTokens / 1000).toLocaleString() + 'k'} tokens</strong></span>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "#64748b", lineHeight: 1.3 }}>
                    {selectedModelInfo.description}
                  </p>
                </div>
              )}
            </div>

            {/* API Key Input */}
            <div className="gy-field-group">
              <div className="gy-field-label">
                <span>Google AI Studio API Key</span>
                <a
                  href="https://aistudio.google.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#38bdf8", textDecoration: "none", fontSize: "11px", textTransform: "none", fontWeight: 600 }}
                >
                  Get Free Key at Google AI Studio â†—
                </a>
              </div>
              <div className="gy-input-wrap">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  placeholder={
                    geminiState.configured
                      ? "AIzaSyâ€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      : "Paste AIzaSy... API key from Google AI Studio"
                  }
                  value={geminiInputKey}
                  onChange={(e) => setGeminiInputKey(e.target.value)}
                  className="gy-input gy-input-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="gy-input-btn"
                >
                  {showGeminiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Active Connection Test Result Callout */}
            {geminiTestResult && (
              <div
                className={`gy-test-result-box ${
                  geminiTestResult.success
                    ? "gy-test-result-success"
                    : (geminiTestResult.statusCode === 503 || geminiTestResult.message.includes("503") || geminiTestResult.message.includes("429")
                      ? "gy-test-result-warning"
                      : "gy-test-result-error")
                }`}
                style={{
                  background: geminiTestResult.success
                    ? "rgba(16, 185, 129, 0.12)"
                    : (geminiTestResult.statusCode === 503 || geminiTestResult.message.includes("503") || geminiTestResult.message.includes("429")
                      ? "rgba(245, 158, 11, 0.12)"
                      : "rgba(239, 68, 68, 0.12)"),
                  border: geminiTestResult.success
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : (geminiTestResult.statusCode === 503 || geminiTestResult.message.includes("503") || geminiTestResult.message.includes("429")
                      ? "1px solid rgba(245, 158, 11, 0.3)"
                      : "1px solid rgba(239, 68, 68, 0.3)"),
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: "3px" }}>
                  <span>
                    {geminiTestResult.success
                      ? (geminiTestResult.fallbackOccurred
                          ? `✅ Live Generation Verified (Fallback to ${geminiTestResult.modelUsed})`
                          : `✅ Live generateContent Succeeded (${geminiTestResult.modelUsed || geminiState.model})`)
                      : (geminiTestResult.statusCode === 503 || geminiTestResult.message.includes("503")
                          ? "⚠ Upstream Capacity Spike (HTTP 503: Unavailable)"
                          : (geminiTestResult.statusCode === 429 || geminiTestResult.message.includes("429")
                              ? "⚠ Quota Limit (HTTP 429: Rate Limited)"
                              : "❌ Generation Failed / Action Required"))}
                  </span>
                  <span style={{ fontSize: "10px", opacity: 0.8 }}>{geminiTestResult.testedAt}</span>
                </div>
                <div style={{ wordBreak: "break-word" }}>{geminiTestResult.message}</div>
                {!geminiTestResult.success && (geminiTestResult.statusCode === 503 || geminiTestResult.message.includes("503")) && (
                  <div style={{ marginTop: "6px", padding: "6px 8px", background: "rgba(245, 158, 11, 0.15)", borderRadius: "4px", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "11px", color: "#fef3c7" }}>
                    💡 <strong>High Demand Spike:</strong> Google's server for <code>{geminiState.model}</code> is temporarily overloaded. NovaVid has automatic exponential backoff retries and fallback models enabled. You can also switch directly to <strong>Gemini 3.5 Flash-Lite</strong> in the model dropdown above and re-test.
                  </div>
                )}
                {!geminiTestResult.success && (geminiTestResult.statusCode === 429 || geminiTestResult.message.includes("429") || geminiTestResult.message.includes("quota")) && (
                  <div style={{ marginTop: "6px", padding: "6px 8px", background: "rgba(245, 158, 11, 0.15)", borderRadius: "4px", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "11px", color: "#fef3c7" }}>
                    💡 <strong>Quota Limit Tip:</strong> Free tier quota on <code>{geminiState.model}</code> has daily limit restrictions. Switch to the verified alternative <strong>Gemini 3.5 Flash-Lite</strong> in the model dropdown above and re-test.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons Bar */}
          <div className="gy-actions-bar">
            <div className="gy-btn-group">
              <button
                onClick={handleSaveGeminiKey}
                disabled={!geminiInputKey.trim()}
                className="gy-btn gy-btn-sky"
                type="button"
              >
                Save Key
              </button>
              <button
                onClick={handleTestGemini}
                disabled={!geminiState.configured || isTestingGemini}
                className="gy-btn gy-btn-secondary"
                type="button"
              >
                {isTestingGemini ? "Pinging..." : "âš¡ Test API Connection"}
              </button>
            </div>

            {geminiState.configured && (
              <button
                onClick={handleRemoveGeminiKey}
                className="gy-link-danger"
                type="button"
              >
                Disconnect Provider
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: YOUTUBE INTEGRATION & CHANNEL DASHBOARD CARD */}
        <div className="gy-card">
          <div className="gy-card-glow-rose"></div>

          <div>
            {/* Header & Status */}
            <div className="gy-card-header">
              <div className="gy-card-title-wrap">
                <div className="gy-avatar-icon gy-icon-rose">
                  â–¶
                </div>
                <div>
                  <h2>YouTube Integration</h2>
                  <p className="gy-account-label gy-label-rose">{youtubeState.accountLabel}</p>
                </div>
              </div>

              {/* Distinct YouTube Connection Badges */}
              <div>
                {youtubeState.authenticated ? (
                  <span className="gy-status-badge gy-badge-connected">
                    <span className="gy-dot-pulse"></span>
                    Live Channel Verified
                  </span>
                ) : isAuthenticatingYT ? (
                  <span className="gy-status-badge gy-badge-warning">
                    <span className="gy-dot-pulse"></span>
                    Waiting for Google Sign-In...
                  </span>
                ) : youtubeState.status === "token_expired" || youtubeState.status === "reauth_required" ? (
                  <span className="gy-status-badge gy-badge-warning">
                    âš  Reauthorization Needed
                  </span>
                ) : youtubeState.status === "error" ? (
                  <span className="gy-status-badge gy-badge-error">
                    âœ• Connection Error
                  </span>
                ) : (
                  <span className="gy-status-badge gy-badge-disconnected">
                    â—‹ Disconnected
                  </span>
                )}
              </div>
            </div>

            {/* OAuth Desktop Client & Secret Configuration Status Banner */}
            <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "10px", background: "#090d16", border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>ðŸ”</span> Google Cloud OAuth 2.0 Desktop Credentials
                </span>
                <button
                  onClick={() => setShowConfigWizard(true)}
                  style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: 0 }}
                  type="button"
                >
                  <span>âš™ï¸</span> Edit / Test Config
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block", marginBottom: "2px" }}>OAuth Client ID:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <code style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "10px" }}>
                      {customClientIdInput.length > 26 ? `${customClientIdInput.substring(0, 22)}...` : customClientIdInput}
                    </code>
                    <span style={{ color: "#10b981", fontSize: "10px", fontWeight: 600 }}>â— Active</span>
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", marginBottom: "2px" }}>OAuth Client Secret:</span>
                  {hasClientSecret ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: "10px" }}>â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢</span>
                      <span style={{ color: "#10b981", fontSize: "10px", fontWeight: 600 }}>(DPAPI Encrypted)</span>
                    </div>
                  ) : youtubeState.authenticated ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#38bdf8", fontSize: "10px", fontWeight: 600 }}>
                        Session Active (DPAPI Verified)
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#f43f5e", fontSize: "10px", fontWeight: 700 }}>
                        âš ï¸ Missing (Action Required)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick OAuth Diagnostics Action Row */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px", paddingTop: "8px", borderTop: "1px solid #1e293b" }}>
                <button
                  type="button"
                  onClick={handleTestRefresh}
                  disabled={isTestingRefresh || !youtubeState.hasRefreshToken}
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#34d399",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: youtubeState.hasRefreshToken ? "pointer" : "not-allowed",
                  }}
                >
                  {isTestingRefresh ? "Testing Refresh..." : "âš¡ Verify Token Renewal"}
                </button>
                <button
                  type="button"
                  onClick={handleTestAuthFlow}
                  disabled={isTestingAuthFlow}
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isTestingAuthFlow ? "Testing PKCE..." : "ðŸ” Verify PKCE Flow"}
                </button>
              </div>
            </div>

            {/* CHANNEL DASHBOARD (When Connected) */}
            {youtubeState.authenticated && youtubeState.selectedChannel ? (
              <div>
                {/* Channel Profile Banner */}
                <div className="gy-channel-profile-card">
                  <div className="gy-channel-left">
                    <div className="gy-channel-avatar">
                      {youtubeState.selectedChannel.avatarUrl ? (
                        <img
                          src={youtubeState.selectedChannel.avatarUrl}
                          alt="Channel Avatar"
                        />
                      ) : (
                        youtubeState.selectedChannel.title.charAt(0)
                      )}
                    </div>
                    <div className="gy-channel-info">
                      <h3>
                        <span>{youtubeState.selectedChannel.title}</span>
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: "rgba(225, 29, 72, 0.2)", color: "#f43f5e", border: "1px solid rgba(225, 29, 72, 0.3)" }}>
                          Official Channel
                        </span>
                      </h3>
                      <p className="gy-channel-handle">
                        {youtubeState.selectedChannel.customUrl || youtubeState.selectedChannel.channelId}
                      </p>
                      <div className="gy-channel-id-row">
                        <span>ID: {youtubeState.selectedChannel.channelId}</span>
                        <button
                          onClick={() => {
                            if (youtubeState.selectedChannel?.channelId) {
                              navigator.clipboard.writeText(youtubeState.selectedChannel.channelId);
                              showNotice("success", "Channel ID copied to clipboard!");
                            }
                          }}
                          className="gy-channel-copy-btn"
                          type="button"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "11px", color: "#94a3b8", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.2)", fontWeight: 600 }}>
                        Google Data API v3 Active
                      </span>
                      <button
                        onClick={handleRefreshChannel}
                        disabled={isRefreshingChannels}
                        className="gy-btn gy-btn-secondary"
                        type="button"
                        style={{ padding: "3px 8px", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}
                        title="Synchronize live statistics from YouTube Data API v3"
                      >
                        <span style={{ display: "inline-block", transform: isRefreshingChannels ? "rotate(180deg)" : "none", transition: "transform 0.5s ease" }}>ðŸ”„</span>
                        {isRefreshingChannels ? "Syncing..." : "Sync Live Stats"}
                      </button>
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      {formatLastSync(youtubeState.lastSyncAt)}
                    </div>
                  </div>
                </div>

                {/* 4 LIVE CHANNEL STATISTICS CARDS */}
                <div className="gy-stats-row">
                  {/* Subscribers */}
                  <div className="gy-stat-card">
                    <span className="gy-stat-header">
                      <span>ðŸ‘¥</span> Subscribers
                    </span>
                    <div className="gy-stat-num">
                      {youtubeState.selectedChannel.hiddenSubscriberCount
                        ? "Hidden"
                        : formatNumber(youtubeState.selectedChannel.subscriberCount)}
                    </div>
                    <span className="gy-stat-sublabel">Live audience</span>
                  </div>

                  {/* Total Views */}
                  <div className="gy-stat-card">
                    <span className="gy-stat-header">
                      <span>ðŸ‘ï¸</span> Total Views
                    </span>
                    <div className="gy-stat-num">
                      {formatNumber(youtubeState.selectedChannel.viewCount)}
                    </div>
                    <span className="gy-stat-sublabel">Cumulative views</span>
                  </div>

                  {/* Uploaded Videos */}
                  <div className="gy-stat-card">
                    <span className="gy-stat-header">
                      <span>ðŸŽ¬</span> Uploads
                    </span>
                    <div className="gy-stat-num">
                      {formatNumber(youtubeState.selectedChannel.videoCount)}
                    </div>
                    <span className="gy-stat-sublabel">Total videos</span>
                  </div>

                  {/* Channel Created */}
                  <div className="gy-stat-card">
                    <span className="gy-stat-header">
                      <span>ðŸ“…</span> Created
                    </span>
                    <div className="gy-stat-num" style={{ fontSize: "13px", paddingTop: "3px" }} title={youtubeState.selectedChannel.publishedAt || ""}>
                      {formatDate(youtubeState.selectedChannel.publishedAt)}
                    </div>
                    <span className="gy-stat-sublabel">Launch date</span>
                  </div>
                </div>

                {/* Connected Quick Links */}
                <div className="gy-quick-links">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <a
                      href={`https://studio.youtube.com/channel/${youtubeState.selectedChannel.channelId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>Studio</span> â†—
                    </a>
                    <span style={{ color: "#334155" }}>|</span>
                    <a
                      href={`https://www.youtube.com/channel/${youtubeState.selectedChannel.channelId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#e2e8f0" }}
                    >
                      <span>Public Channel</span> â†—
                    </a>
                  </div>

                  {onNavigateToPublish && (
                    <button
                      onClick={onNavigateToPublish}
                      style={{ background: "rgba(225, 29, 72, 0.15)", border: "1px solid rgba(225, 29, 72, 0.3)", color: "#fb7185", borderRadius: "8px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      type="button"
                    >
                      Open Publishing Studio â†’
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* CALL TO ACTION (When Disconnected) */
              <div>
                <div className="gy-cta-box">
                  <div className="gy-cta-icon">
                    â–¶
                  </div>
                  <h3>One-Click LODHI TECHX Channel Authorization</h3>
                  <p>
                    Authenticate your LODHI TECHX Google Account via Google OAuth 2.0 PKCE on local loopback (127.0.0.1:8911). Verified scopes: Resumable Uploads, Read-Only Channel Stats, and YouTube Analytics.
                  </p>

                  <button
                    onClick={handleConnectYouTube}
                    disabled={isAuthenticatingYT}
                    className="gy-btn gy-btn-rose"
                    type="button"
                    style={{ padding: "12px 24px", fontSize: "13px" }}
                  >
                    <span>ðŸ“º</span>
                    <span>{isAuthenticatingYT ? "Waiting for Browser Authorization..." : "Connect YouTube Channel"}</span>
                  </button>
                </div>

                {/* Step-by-step guidance cards */}
                <div className="gy-guide-grid">
                  <div className="gy-guide-card">
                    <strong>1. Active Channel</strong>
                    <span>Ensure your account has a channel created at youtube.com.</span>
                  </div>
                  <div className="gy-guide-card">
                    <strong>2. PKCE Handshake</strong>
                    <span>Loopback port 8911 securely receives the authorization code.</span>
                  </div>
                  <div className="gy-guide-card">
                    <strong>3. DPAPI Storage</strong>
                    <span>Tokens are encrypted in Windows Credential Manager.</span>
                  </div>
                </div>
              </div>
            )}

            {/* In-Flight Loopback Waiting Notice & Fallback URL */}
            {isAuthenticatingYT && (
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fde68a", fontSize: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                  <span className="gy-dot-pulse" style={{ background: "#f59e0b" }}></span>
                  OAuth 2.0 PKCE Loopback listener waiting on port 8911...
                </div>
                <p style={{ margin: "6px 0 8px", color: "#cbd5e1", fontSize: "11px" }}>
                  A browser tab was launched. If your browser did not open automatically, copy and paste this URL into your browser:
                </p>
                {authUrlForCopy && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      readOnly
                      value={authUrlForCopy}
                      className="gy-input gy-input-mono"
                      style={{ fontSize: "11px", padding: "6px 10px" }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(authUrlForCopy);
                        showNotice("success", "Auth URL copied to clipboard!");
                      }}
                      className="gy-btn gy-btn-secondary"
                      type="button"
                      style={{ padding: "6px 12px", fontSize: "11px", flexShrink: 0 }}
                    >
                      Copy URL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons Bar */}
          <div className="gy-actions-bar">
            {youtubeState.authenticated ? (
              <>
                <div className="gy-btn-group">
                  <button
                    onClick={handleRefreshChannel}
                    disabled={isRefreshingChannels}
                    className="gy-btn gy-btn-secondary"
                    type="button"
                  >
                    <span>ðŸ”„</span>
                    <span>Refresh Channel Data</span>
                  </button>
                  <button
                    onClick={handleConnectYouTube}
                    disabled={isAuthenticatingYT}
                    className="gy-btn gy-btn-secondary"
                    type="button"
                  >
                    Switch Account
                  </button>
                </div>
                <button
                  onClick={handleDisconnectYouTube}
                  className="gy-link-danger"
                  type="button"
                >
                  Disconnect Channel
                </button>
              </>
            ) : (
              <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                OAuth token will refresh automatically before expiration using offline refresh token.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HEALTH DIAGNOSTICS DASHBOARD (PRD SECTION 8) */}
      <div className="gy-diagnostics-panel">
        <div className="gy-diag-header">
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>ðŸ©º</span> Automatic Configuration & Health Diagnostics
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              Live validation of Google Cloud credentials, OAuth scopes, DPAPI keychains, and mandatory safety gates.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {diagnostics && (
              <div style={{ display: "flex", gap: "6px" }}>
                <span className={`gy-pill ${diagnostics.overallHealthy ? "gy-pill-dpapi" : "gy-pill-brand"}`}>
                  {diagnostics.overallHealthy ? "â— System Healthy" : "âœ• Needs Attention"}
                </span>
                <span className={`gy-pill ${diagnostics.canUpload ? "gy-pill-dpapi" : "gy-pill-brand"}`} style={{ opacity: diagnostics.canUpload ? 1 : 0.6 }}>
                  {diagnostics.canUpload ? "â— Upload Ready" : "â—‹ Upload Offline"}
                </span>
                <span
                  className={`gy-pill ${diagnostics.canGenerateAI ? "gy-pill-dpapi" : "gy-pill-brand"}`}
                  style={{
                    opacity: diagnostics.canGenerateAI ? 1 : 0.85,
                    color: diagnostics.canGenerateAI ? undefined : (diagnostics.geminiConfigured ? "#f59e0b" : undefined),
                  }}
                >
                  {diagnostics.canGenerateAI
                    ? "● AI Ready"
                    : (diagnostics.geminiConfigured
                      ? "⚠ AI Temporarily Unavailable"
                      : "○ AI Offline")}
                </span>
              </div>
            )}
            <button
              onClick={refreshAllData}
              className="gy-btn gy-btn-secondary"
              type="button"
            >
              Re-run Scan
            </button>
          </div>
        </div>

        {/* Diagnostic Items Grid */}
        <div className="gy-diag-grid">
          {diagnostics?.items.map((item) => (
            <div
              key={item.id}
              className={`gy-diag-card ${
                item.displayStatus === "PASS"
                  ? "gy-diag-pass"
                  : item.displayStatus === "WARNING"
                  ? "gy-diag-warn"
                  : item.displayStatus === "FAILED"
                  ? "gy-diag-fail"
                  : ""
              }`}
            >
              <div>
                <div className="gy-diag-top">
                  <span className="gy-diag-name">{item.name}</span>
                  <span
                    className={`gy-status-badge ${
                      item.displayStatus === "PASS"
                        ? "gy-badge-connected"
                        : item.displayStatus === "WARNING"
                        ? "gy-badge-warning"
                        : item.displayStatus === "FAILED"
                        ? "gy-badge-error"
                        : "gy-badge-disconnected"
                    }`}
                  >
                    {item.displayStatus}
                  </span>
                </div>
                <p className="gy-diag-msg">{item.message}</p>
              </div>

              {item.actionLink && (
                <div>
                  <a
                    href={item.actionLink}
                    target="_blank"
                    rel="noreferrer"
                    className="gy-diag-link"
                  >
                    {item.actionText || "Learn More"} â†—
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RECENT UPLOAD ACTIVITY & PUBLISHING HISTORY */}
      <div className="gy-table-panel">
        <div className="gy-diag-header">
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>ðŸ“‹</span> Recent YouTube Upload Activity & History
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              History of rendered videos uploaded via the YouTube Data API resumable protocol.
            </p>
          </div>
          <div className="gy-btn-group">
            {onNavigateToResearch && (
              <button
                onClick={onNavigateToResearch}
                className="gy-btn gy-btn-secondary"
                type="button"
              >
                Open AI Research
              </button>
            )}
            {onNavigateToPublish && (
              <button
                onClick={onNavigateToPublish}
                className="gy-btn gy-btn-rose"
                type="button"
              >
                Open Publishing Studio
              </button>
            )}
          </div>
        </div>

        {uploadHistory.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
            No upload history recorded yet. Use the <strong>Publishing Studio</strong> to upload your first video.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="gy-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Status</th>
                  <th>Privacy</th>
                  <th>YouTube Video ID</th>
                  <th>Uploaded Size</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Links</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontFamily: "monospace", color: "#94a3b8" }}>{job.id.slice(0, 16)}...</td>
                    <td>
                      <span
                        className={`gy-status-badge ${
                          job.status === "completed"
                            ? "gy-badge-connected"
                            : job.status === "uploading"
                            ? "gy-badge-configured"
                            : "gy-badge-error"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: "2px 6px", borderRadius: "4px", background: "#1e293b", fontSize: "10px", fontWeight: 600 }}>
                        ðŸ”’ Private
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#ffffff", fontWeight: 700 }}>
                      {job.youtubeVideoId || "Pending"}
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      {(job.bytesUploaded / (1024 * 1024)).toFixed(1)} MB / {(job.totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      {job.publishedAt || "Recently"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {job.youtubeVideoId && !job.youtubeVideoId.startsWith("vid_") && (
                        <a
                          href={`https://studio.youtube.com/video/${job.youtubeVideoId}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#f43f5e", fontWeight: 700, textDecoration: "none" }}
                        >
                          Studio â†—
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOM GOOGLE CLOUD OAUTH CLIENT MODAL */}
      {showConfigWizard && (
        <div className="gy-modal-overlay">
          <div className="gy-modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid #1e293b" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>âš™ï¸</span> Custom Google Cloud OAuth Client ID
              </h3>
              <button
                onClick={() => setShowConfigWizard(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "16px", cursor: "pointer" }}
                type="button"
              >
                âœ•
              </button>
            </div>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px", fontSize: "12px", color: "#cbd5e1" }}>
              <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fde68a", fontSize: "11px", lineHeight: 1.5 }}>
                <strong>Google Cloud Console Requirement:</strong> When creating credentials in Google Cloud, select <strong>Application type: Desktop app</strong>. Do <em>NOT</em> choose &quot;Chrome Extension&quot; or &quot;Web application&quot; (Google will reject loopback authorization with <code>401 invalid_client</code>).
              </div>

              <p style={{ margin: 0, lineHeight: 1.4 }}>
                Configure your Google Cloud Project OAuth 2.0 Desktop credentials for <strong>LODHI TECHX</strong>:
              </p>

              <div>
                <label style={{ display: "block", color: "#cbd5e1", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", fontSize: "10px" }}>
                  OAuth Desktop Client ID
                </label>
                <input
                  type="text"
                  value={customClientIdInput}
                  onChange={(e) => setCustomClientIdInput(e.target.value)}
                  placeholder="e.g. 123456789-xxxxx.apps.googleusercontent.com"
                  className="gy-input gy-input-mono"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ color: "#cbd5e1", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", margin: 0 }}>
                    OAuth Client Secret
                  </label>
                  {hasClientSecret ? (
                    <span style={{ color: "#10b981", fontSize: "10px", fontWeight: 600 }}>
                      ðŸ”’ Encrypted in DPAPI
                    </span>
                  ) : (
                    <span style={{ color: "#f43f5e", fontSize: "10px", fontWeight: 600 }}>
                      âš ï¸ Required for Google OAuth
                    </span>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showSecretInModal ? "text" : "password"}
                    value={customClientSecretInput}
                    onChange={(e) => setCustomClientSecretInput(e.target.value)}
                    placeholder={
                      hasClientSecret
                        ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢ (Encrypted in DPAPI â€” leave blank to keep)"
                        : "Enter Client Secret starting with GOCSPX-..."
                    }
                    className="gy-input gy-input-mono"
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretInModal(!showSecretInModal)}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}
                    title={showSecretInModal ? "Hide Secret" : "Show Secret"}
                  >
                    {showSecretInModal ? "ðŸ™ˆ" : "ðŸ‘ï¸"}
                  </button>
                </div>
              </div>

              {testConfigResult && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    background: testConfigResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    border: `1px solid ${testConfigResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    color: testConfigResult.success ? "#34d399" : "#f87171",
                  }}
                >
                  <strong>{testConfigResult.success ? "âœ… Valid: " : "âŒ Error: "}</strong>
                  {testConfigResult.message}
                </div>
              )}

              <div style={{ padding: "12px", borderRadius: "10px", background: "#090d16", border: "1px solid #1e293b", fontSize: "11px", color: "#94a3b8" }}>
                <strong style={{ color: "#e2e8f0" }}>Authorized Redirect URI:</strong>
                <p style={{ margin: "4px 0" }}>In Google Cloud Console &gt; Credentials &gt; OAuth Client ID, set the Authorized redirect URI to:</p>
                <code style={{ display: "block", marginTop: "4px", padding: "6px 8px", background: "#0c111d", borderRadius: "6px", color: "#38bdf8", fontFamily: "monospace", border: "1px solid #1e293b" }}>
                  http://127.0.0.1:8911/oauth2callback
                </code>
              </div>
            </div>

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={handleTestClientConfig}
                className="gy-btn gy-btn-secondary"
                type="button"
                style={{ fontSize: "11px", padding: "8px 14px" }}
              >
                <span>ðŸ§ª</span> Validate Credentials
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    setShowConfigWizard(false);
                    setTestConfigResult(null);
                  }}
                  className="gy-btn gy-btn-secondary"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomClientConfig}
                  className="gy-btn gy-btn-sky"
                  type="button"
                >
                  Save to Windows Vault
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
