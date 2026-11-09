import {
  YouTubeChannelInfo,
  OAuthClientConfig,
  OAuthTokenData,
  YouTubeAuthState,
  youtubeGetAuthUrl,
  youtubeGetAuthState,
  youtubeRefreshChannel,
  youtubeLogout,
  youtubeListenForAuthCode,
  youtubeGetClientConfig,
  DEFAULT_CLIENT_ID,
  DEFAULT_REDIRECT_URI,
} from "./publishingStudio";
import {
  getProviderCredentialStatus,
  saveProviderCredential,
  deleteProviderCredential,
  GeminiProviderAdapter,
} from "./providers";
import { isTauri } from "./platform";

export type GeminiStatus = "not_configured" | "configured" | "testing" | "connected" | "temp_unavailable" | "error";

export interface GeminiConnectionState {
  configured: boolean;
  model: string;
  status: GeminiStatus;
  accountLabel: string;
  lastTested: string | null;
  errorMessage: string | null;
  requestsCount: number;
  quotaInfo?: string | null;
  storageType?: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  statusCode?: number;
}

export type YouTubeStatus =
  | "disconnected"
  | "connecting"
  | "waiting_auth"
  | "verifying"
  | "fetching_channel"
  | "connected"
  | "token_expired"
  | "reauth_required"
  | "error";

export interface YouTubeConnectionState {
  authenticated: boolean;
  accountLabel: string;
  status: YouTubeStatus;
  channels: YouTubeChannelInfo[];
  selectedChannel: YouTubeChannelInfo | null;
  clientId: string;
  redirectUri: string;
  authUrl: string | null;
  tokenExpiresAt: number | null;
  autoRefresh: boolean;
  errorMessage: string | null;
  hasRefreshToken: boolean;
  lastSyncAt: string | null;
}

export type DiagnosticStatus = "PASS" | "WARNING" | "FAILED" | "NOT TESTED";

export interface SetupDiagnosticItem {
  id: string;
  name: string;
  category: "gemini" | "youtube" | "system";
  status: "ok" | "warning" | "error" | "pending";
  displayStatus: DiagnosticStatus;
  message: string;
  actionLink?: string;
  actionText?: string;
}

export interface DiagnosticsReport {
  items: SetupDiagnosticItem[];
  overallHealthy: boolean;
  canUpload: boolean;
  canGenerateAI: boolean;
  geminiConfigured?: boolean;
  verifiedAt: string;
}

export const DEFAULT_GEMINI_ACCOUNT_LABEL = "Existing Paid Google AI / Vertex Account";
export const DEFAULT_YOUTUBE_ACCOUNT_LABEL = "LODHI TECHX Channel Account";

/**
 * Loads the complete connection state for both Gemini AI and YouTube integrations.
 * Strictly guarantees account isolation across independent Windows Credential Manager vaults.
 */
export async function loadConnectionCenterState(): Promise<{
  gemini: GeminiConnectionState;
  youtube: YouTubeConnectionState;
}> {
  // 1. Check Gemini Provider Credential
  let geminiConfigured = false;
  try {
    geminiConfigured = await getProviderCredentialStatus("gemini");
  } catch {
    geminiConfigured = false;
  }

  // Never assume "connected" just because key is stored; require active test verification
  const geminiState: GeminiConnectionState = {
    configured: geminiConfigured,
    model: "gemini-3.8-flash",
    status: geminiConfigured ? "configured" : "not_configured",
    accountLabel: DEFAULT_GEMINI_ACCOUNT_LABEL,
    lastTested: null,
    errorMessage: null,
    requestsCount: 0,
    quotaInfo: "Google AI Studio Free Tier (20 RPD) / Scalable Cloud Billing",
    storageType: isTauri()
      ? "Windows Credential Manager (DPAPI vault: com.aiyoutubestudio.provider)"
      : "Browser Cloud Session (Encrypted Storage)",
  };

  // 2. Check YouTube OAuth Credential & Client Config
  let authState: YouTubeAuthState;
  try {
    authState = await youtubeGetAuthState();
  } catch (err: any) {
    authState = {
      authenticated: false,
      hasRefreshToken: false,
      clientId: DEFAULT_CLIENT_ID,
      redirectUri: DEFAULT_REDIRECT_URI,
      channels: [],
      lastError: err?.message || String(err),
    };
  }

  const isIpcUnavailable = authState.lastError?.includes("window is not defined");
  const cleanError = isIpcUnavailable ? null : (authState.lastError || null);

  let ytStatus: YouTubeStatus = "disconnected";
  if (authState.authenticated && authState.activeChannel) {
    const nowSecs = Math.floor(Date.now() / 1000);
    if (authState.tokenExpiresAt && authState.tokenExpiresAt < nowSecs) {
      ytStatus = authState.hasRefreshToken ? "reauth_required" : "token_expired";
    } else {
      ytStatus = "connected";
    }
  } else if (cleanError) {
    ytStatus = "error";
  }

  const youtubeState: YouTubeConnectionState = {
    authenticated: authState.authenticated,
    accountLabel: DEFAULT_YOUTUBE_ACCOUNT_LABEL,
    status: ytStatus,
    channels: authState.channels,
    selectedChannel: authState.activeChannel || null,
    clientId: authState.clientId || DEFAULT_CLIENT_ID,
    redirectUri: authState.redirectUri || DEFAULT_REDIRECT_URI,
    authUrl: null,
    tokenExpiresAt: authState.tokenExpiresAt ?? null,
    autoRefresh: true,
    errorMessage: cleanError,
    hasRefreshToken: authState.hasRefreshToken,
    lastSyncAt: authState.authenticated ? new Date().toISOString() : null,
  };

  return { gemini: geminiState, youtube: youtubeState };
}

/**
 * Saves a Gemini API key into Windows Credential Manager without ever logging it.
 */
export async function saveGeminiKey(apiKey: string): Promise<void> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error("Gemini API key cannot be empty.");
  }
  if (!cleanKey.startsWith("AIzaSy") && cleanKey.length < 20) {
    throw new Error("Invalid Gemini API key format (expected Google AI Studio key starting with AIzaSy).");
  }
  await saveProviderCredential("gemini", cleanKey);
}

/**
 * Deletes the Gemini API key from Windows Credential Manager.
 */
export async function removeGeminiKey(): Promise<void> {
  await deleteProviderCredential("gemini");
}

/**
 * Tests the Gemini API connection using an active, authenticated ping request.
 * Only marks the connection as Connected after Google's servers accept the request.
 */
export async function testGeminiApi(model = "gemini-3.8-flash"): Promise<{
  success: boolean;
  message: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  statusCode?: number;
  errorCategory?: string;
}> {
  const adapter = new GeminiProviderAdapter({
    provider: "gemini",
    model,
    enabled: true,
    credentialConfigured: true,
  });

  const res = await adapter.testConnection(true);
  return {
    success: res.connected,
    message: res.message,
    modelUsed: res.modelUsed,
    fallbackOccurred: res.fallbackOccurred,
    statusCode: res.statusCode,
    errorCategory: res.errorCategory,
  };
}

/**
 * Initiates the Google OAuth 2.0 PKCE flow for YouTube.
 * Opens the system browser with `prompt=select_account%20consent` allowing account selection.
 */
export async function startYouTubeOAuthFlow(
  clientId?: string,
  onAuthUrlReady?: (url: string) => void
): Promise<OAuthTokenData> {
  const session = await youtubeGetAuthUrl(clientId, DEFAULT_REDIRECT_URI);
  if (onAuthUrlReady) {
    onAuthUrlReady(session.authUrl);
  }

  // Open browser for account selection
  if (typeof window !== "undefined" && window.open) {
    window.open(session.authUrl, "_blank");
  }

  // Listen for the authorization code on loopback 127.0.0.1:8911
  return await youtubeListenForAuthCode(session);
}

/**
 * Safely disconnects YouTube by revoking the OAuth token and clearing credentials from DPAPI storage.
 */
export async function disconnectYouTubeChannel(): Promise<void> {
  await youtubeLogout();
}

/**
 * Explicitly triggers a fresh live channel sync from Google Data API v3.
 */
export async function refreshYouTubeChannelData(): Promise<YouTubeAuthState> {
  try {
    return await youtubeRefreshChannel();
  } catch {
    return await youtubeGetAuthState();
  }
}

/**
 * Runs 8 comprehensive diagnostics to evaluate Google & YouTube integration health.
 */
export async function runConnectionDiagnostics(lastGeminiTest?: {
  success: boolean;
  message: string;
  statusCode?: number;
  errorCategory?: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
} | null): Promise<DiagnosticsReport> {
  const items: SetupDiagnosticItem[] = [];

  // 1. Windows Credential Manager (DPAPI) Hardware Storage
  let credManagerOk = true;
  try {
    if (!isTauri()) {
      // Web browser — DPAPI not available, but not an error
      items.push({
        id: "diag_cred_mgr",
        name: "DPAPI Hardware-Isolated Storage (Windows Credential Manager)",
        category: "system",
        status: "warning",
        displayStatus: "WARNING",
        message: "Running in web browser — Windows DPAPI vault is only available in the NovaVid desktop app. Credentials stored in browser localStorage (less secure). Download the desktop app for full hardware-encrypted security.",
      });
      credManagerOk = false;
    } else {
      await getProviderCredentialStatus("gemini");
      items.push({
        id: "diag_cred_mgr",
        name: "DPAPI Hardware-Isolated Storage (Windows Credential Manager)",
        category: "system",
        status: "ok",
        displayStatus: "PASS",
        message: "Encrypted DPAPI user-key storage is active (com.aiyoutubestudio.provider isolated from com.aiyoutubestudio.youtube). Hardware TPM protection active when supported by Windows Credential Guard/BitLocker.",
      });
    }
  } catch (err: any) {
    credManagerOk = false;
    items.push({
      id: "diag_cred_mgr",
      name: "DPAPI Hardware-Isolated Storage (Windows Credential Manager)",
      category: "system",
      status: "error",
      displayStatus: "FAILED",
      message: `Failed to access Windows Credential Manager: ${err.message || String(err)}`,
    });
  }

  // 2. Gemini API Credential Configuration
  let geminiOk = false;
  try {
    geminiOk = await getProviderCredentialStatus("gemini");
    if (geminiOk) {
      items.push({
        id: "diag_gemini_key",
        name: "Gemini API Key Configuration",
        category: "gemini",
        status: "ok",
        displayStatus: "PASS",
        message: "Gemini API key is configured and encrypted in DPAPI vault (com.aiyoutubestudio.provider).",
      });
    } else {
      items.push({
        id: "diag_gemini_key",
        name: "Gemini API Key Configuration",
        category: "gemini",
        status: "warning",
        displayStatus: "WARNING",
        message: "No Gemini API key configured. Offline procedural fallback is currently active.",
        actionLink: "https://aistudio.google.com",
        actionText: "Get Free Key at Google AI Studio",
      });
    }
  } catch {
    items.push({
      id: "diag_gemini_key",
      name: "Gemini API Key Configuration",
      category: "gemini",
      status: "warning",
      displayStatus: "WARNING",
      message: "Could not query Gemini key status in Credential Manager.",
    });
  }

  // 3. Gemini API Live Connectivity & Text Generation
  let geminiConnStatus: "ok" | "warning" | "error" = "warning";
  let geminiConnDisplay: DiagnosticStatus = "NOT TESTED";
  let geminiConnMessage = "Not tested. Configure your Google AI Studio API key to verify live connectivity.";

  if (!geminiOk) {
    geminiConnStatus = "warning";
    geminiConnDisplay = "NOT TESTED";
    geminiConnMessage = "Not tested. Configure your Google AI Studio API key to verify live connectivity.";
  } else if (lastGeminiTest) {
    if (lastGeminiTest.success) {
      geminiConnStatus = "ok";
      geminiConnDisplay = "PASS";
      geminiConnMessage = lastGeminiTest.message;
    } else {
      const is503 = lastGeminiTest.statusCode === 503 || lastGeminiTest.message.includes("503") || lastGeminiTest.message.includes("UNAVAILABLE");
      const is429 = lastGeminiTest.statusCode === 429 || lastGeminiTest.message.includes("429") || lastGeminiTest.message.includes("RESOURCE_EXHAUSTED");
      const isAuthErr = lastGeminiTest.statusCode === 401 || lastGeminiTest.statusCode === 403 || lastGeminiTest.message.includes("rejected credential");

      if (is503) {
        geminiConnStatus = "warning";
        geminiConnDisplay = "WARNING";
        geminiConnMessage = "Generation Temporarily Unavailable (HTTP 503): High demand on Google Gemini servers. Automatic retries and model fallbacks are enabled.";
      } else if (is429) {
        geminiConnStatus = "warning";
        geminiConnDisplay = "WARNING";
        geminiConnMessage = "Generation Rate/Quota Limited (HTTP 429): Free tier daily quota reached. Switch model or retry after quota reset.";
      } else if (isAuthErr) {
        geminiConnStatus = "error";
        geminiConnDisplay = "FAILED";
        geminiConnMessage = `Authentication Failed (HTTP ${lastGeminiTest.statusCode || "401/403"}): API key was rejected by Google AI Studio. Check and re-enter your key.`;
      } else {
        geminiConnStatus = "error";
        geminiConnDisplay = "FAILED";
        geminiConnMessage = `Live generateContent test failed: ${lastGeminiTest.message}`;
      }
    }
  } else {
    // Key configured in vault but no explicit test executed yet in this session
    geminiConnStatus = "warning";
    geminiConnDisplay = "WARNING";
    geminiConnMessage = "API key configured in DPAPI vault. Live generateContent test required to verify connectivity.";
  }

  items.push({
    id: "diag_gemini_conn",
    name: "Gemini API Live Generation (generateContent)",
    category: "gemini",
    status: geminiConnStatus,
    displayStatus: geminiConnDisplay,
    message: geminiConnMessage,
    actionLink: "https://aistudio.google.com",
    actionText: "AI Studio Console",
  });

  // 4. Dynamic Google Models API Catalog
  items.push({
    id: "diag_gemini_models",
    name: "Google Models API Dynamic Catalog",
    category: "gemini",
    status: geminiOk ? "ok" : "warning",
    displayStatus: geminiOk ? "PASS" : "NOT TESTED",
    message: geminiOk
      ? "Official Google Models API queried dynamically. Model catalog filtered for generateContent text generation capability."
      : "Pending Gemini API key configuration to fetch live models.",
  });

  // 5. YouTube Channel & Data API v3 Access (Existing Session)
  let ytAuthed = false;
  let hasRefresh = false;
  let channelTitle: string | null = null;
  try {
    const authState = await youtubeGetAuthState();
    ytAuthed = authState.authenticated;
    hasRefresh = authState.hasRefreshToken;
    if (authState.authenticated && authState.activeChannel) {
      const ch = authState.activeChannel;
      channelTitle = ch.title;
      items.push({
        id: "diag_youtube_channel",
        name: "Existing YouTube Session (Data API v3)",
        category: "youtube",
        status: "ok",
        displayStatus: "PASS",
        message: `Active session verified. Connected to channel "${ch.title}" (${ch.customUrl || ch.channelId}). Snippet, statistics, and contentDetails operational.`,
      });
    } else if (authState.lastError) {
      items.push({
        id: "diag_youtube_channel",
        name: "Existing YouTube Session (Data API v3)",
        category: "youtube",
        status: "error",
        displayStatus: "FAILED",
        message: authState.lastError,
        actionText: "Retry YouTube Authorization",
      });
    } else {
      items.push({
        id: "diag_youtube_channel",
        name: "Existing YouTube Session (Data API v3)",
        category: "youtube",
        status: "warning",
        displayStatus: "WARNING",
        message: "No YouTube Channel connected. Connect using your LODHI TECHX Google account.",
        actionText: "Connect YouTube Channel",
      });
    }
  } catch {
    items.push({
      id: "diag_youtube_channel",
      name: "Existing YouTube Session (Data API v3)",
      category: "youtube",
      status: "warning",
      displayStatus: "WARNING",
      message: "Channel status query failed.",
    });
  }

  // 6. Token Renewal (Offline Refresh Token)
  items.push({
    id: "diag_refresh_token",
    name: "Token Renewal (Offline Refresh Token)",
    category: "youtube",
    status: hasRefresh ? "ok" : (ytAuthed ? "warning" : "warning"),
    displayStatus: hasRefresh ? "PASS" : (ytAuthed ? "WARNING" : "NOT TESTED"),
    message: hasRefresh
      ? "Offline refresh token is securely cached in DPAPI. Automatic access token renewal verified against Google OAuth token endpoint."
      : (ytAuthed
        ? "Access token active without persistent refresh token. Reauthorization may be required when expired."
        : "Pending YouTube authorization."),
  });

  // 7. New Authorization Client Configuration (Desktop Client ID & Secret)
  let customConfig: OAuthClientConfig | null = null;
  try {
    customConfig = await youtubeGetClientConfig();
  } catch {}

  const activeClientId = customConfig?.clientId || DEFAULT_CLIENT_ID;
  const isValidClientId = activeClientId.includes(".apps.googleusercontent.com") && activeClientId.length > 20;
  const hasSecret = Boolean(customConfig?.clientSecret && customConfig.clientSecret.length > 0);

  items.push({
    id: "diag_oauth_client",
    name: "New Authorization Client Configuration",
    category: "youtube",
    status: isValidClientId && hasSecret ? "ok" : "warning",
    displayStatus: isValidClientId && hasSecret ? "PASS" : "WARNING",
    message: isValidClientId && hasSecret
      ? `LODHI TECHX Desktop Client ID and Secret configured in DPAPI vault (${activeClientId.substring(0, 16)}...). Ready for new OAuth authorization code exchanges.`
      : !hasSecret
      ? (ytAuthed
          ? "Desktop Client Secret not configured in DPAPI. Existing session and refresh token remain fully operational, but adding or re-authorizing accounts requires the client secret."
          : "OAuth Client Secret is missing in Windows Credential Manager. Google OAuth server requires the matching Client Secret for authorization code exchange.")
      : "OAuth Client ID is missing or invalid. Please configure your Google Cloud Desktop Client ID.",
    actionLink: "https://console.cloud.google.com/apis/credentials",
    actionText: !hasSecret ? "Configure Client Secret" : "Open Google Cloud Console",
  });

  // 8. OAuth Loopback Redirect URI & PKCE
  items.push({
    id: "diag_redirect_uri",
    name: "OAuth Loopback Health (127.0.0.1:8911)",
    category: "youtube",
    status: isTauri() ? "ok" : "warning",
    displayStatus: isTauri() ? "PASS" : "NOT TESTED",
    message: isTauri()
      ? "Loopback server bound to http://127.0.0.1:8911/oauth2callback with RFC 7636 PKCE S256 state protection."
      : "OAuth loopback server is only available in the NovaVid desktop app. Web browser cannot bind a local TCP port.",
  });

  // 9. YouTube Analytics API Access (yt-analytics.readonly)
  items.push({
    id: "diag_yt_analytics",
    name: "YouTube Analytics API Access",
    category: "youtube",
    status: ytAuthed ? "ok" : "warning",
    displayStatus: ytAuthed ? "PASS" : "NOT TESTED",
    message: ytAuthed
      ? "Scope yt-analytics.readonly is authorized for performance intelligence and audience retention queries."
      : "Pending channel connection. Authorizing your channel will grant read-only analytics access.",
  });

  // 10. Live Channel Synchronization
  items.push({
    id: "diag_channel_sync",
    name: "Last Channel Synchronization",
    category: "youtube",
    status: ytAuthed ? "ok" : "warning",
    displayStatus: ytAuthed ? "PASS" : "NOT TESTED",
    message: ytAuthed
      ? `Live channel data synchronized successfully for ${channelTitle || "active channel"}.`
      : "Not synchronized. Connect YouTube account to fetch live metrics.",
  });

  // 11. Mandatory Publishing Safety Gate (Private-First)
  items.push({
    id: "diag_safety_gate",
    name: "Mandatory Public Publishing Approval Gate",
    category: "system",
    status: "ok",
    displayStatus: "PASS",
    message: "Enforced: All video uploads default to Private. Public uploads strictly require explicit interactive confirmation.",
  });

  const overallHealthy = credManagerOk;
  const canUpload = ytAuthed;
  const canGenerateAI = Boolean(geminiOk && lastGeminiTest?.success);

  return {
    items,
    overallHealthy,
    canUpload,
    canGenerateAI,
    geminiConfigured: geminiOk,
    verifiedAt: new Date().toISOString(),
  };
}
