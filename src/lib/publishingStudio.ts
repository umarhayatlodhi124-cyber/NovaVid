import { isTauri, tauriInvoke } from "./platform";

export interface YouTubeChannelInfo {
  id: string;
  channelId: string;
  title: string;
  customUrl?: string;
  avatarUrl?: string;
  subscriberCount: number;
  videoCount: number;
  isActive: boolean;
  viewCount?: number;
  hiddenSubscriberCount?: boolean;
  publishedAt?: string;
}

export interface PkceSession {
  clientId?: string;
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  authUrl: string;
}

export interface OAuthClientConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface OAuthTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

export interface YouTubeAuthState {
  authenticated: boolean;
  tokenExpiresAt?: number;
  hasRefreshToken: boolean;
  scope?: string;
  clientId: string;
  redirectUri: string;
  activeChannel?: YouTubeChannelInfo;
  channels: YouTubeChannelInfo[];
  lastError?: string;
}

export interface PublishVideoRequest {
  projectId: string;
  channelId: string;
  videoPath: string;
  thumbnailPath?: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
  madeForKids: boolean;
  categoryId: string;
}

export interface PublishJobStatus {
  id: string;
  projectId: string;
  channelId: string;
  status: "pending" | "uploading" | "processing" | "completed" | "failed" | "cancelled";
  progressPercent: number;
  bytesUploaded: number;
  totalBytes: number;
  youtubeVideoId?: string;
  errorMessage?: string;
  publishedAt?: string;
}

export const DEFAULT_CLIENT_ID = "223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com";
export const DEFAULT_REDIRECT_URI = "http://127.0.0.1:8911/oauth2callback";

export async function youtubeGetAuthUrl(
  clientId?: string,
  redirectUri: string = DEFAULT_REDIRECT_URI
): Promise<PkceSession> {
  if (!isTauri()) throw new Error("DESKTOP_ONLY: YouTube OAuth loopback requires the NovaVid desktop app.");
  return await tauriInvoke<PkceSession>("youtube_get_auth_url", {
    clientId: clientId?.trim() ? clientId.trim() : null,
    redirectUri,
  });
}

export async function youtubeGetCredentialStatus(): Promise<boolean> {
  try {
    if (!isTauri()) return false;
    return await tauriInvoke<boolean>("youtube_get_credential_status");
  } catch {
    return false;
  }
}

export async function youtubeGetAuthState(): Promise<YouTubeAuthState> {
  if (!isTauri()) {
    return {
      authenticated: false,
      hasRefreshToken: false,
      clientId: DEFAULT_CLIENT_ID,
      redirectUri: DEFAULT_REDIRECT_URI,
      channels: [],
      lastError: undefined, // No error on web — just not available
    };
  }
  try {
    return await tauriInvoke<YouTubeAuthState>("youtube_get_auth_state");
  } catch (err: any) {
    return {
      authenticated: false,
      hasRefreshToken: false,
      clientId: DEFAULT_CLIENT_ID,
      redirectUri: DEFAULT_REDIRECT_URI,
      channels: [],
      lastError: err?.message || String(err),
    };
  }
}

export async function youtubeLogout(): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("youtube_logout");
}

export async function youtubeRefreshChannel(): Promise<YouTubeAuthState> {
  if (!isTauri()) throw new Error("DESKTOP_ONLY: Channel refresh requires the NovaVid desktop app.");
  return await tauriInvoke<YouTubeAuthState>("youtube_refresh_channel");
}

export async function youtubeSaveTokenData(token: OAuthTokenData): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("youtube_save_token_data", { token });
}

export async function youtubeSaveClientConfig(config: OAuthClientConfig): Promise<void> {
  if (!isTauri()) {
    // Web: store in localStorage
    localStorage.setItem("novavid_yt_client_config", JSON.stringify(config));
    return;
  }
  await tauriInvoke("youtube_save_client_config", { config });
}

export async function youtubeGetClientConfig(): Promise<OAuthClientConfig | null> {
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem("novavid_yt_client_config");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  try {
    return await tauriInvoke<OAuthClientConfig | null>("youtube_get_client_config_command");
  } catch {
    return null;
  }
}

export async function youtubeTestRefreshToken(): Promise<string> {
  if (!isTauri()) throw new Error("DESKTOP_ONLY: Token refresh test requires the NovaVid desktop app.");
  return await tauriInvoke<string>("youtube_test_refresh_token");
}

export async function youtubeTestAuthFlow(): Promise<string> {
  if (!isTauri()) throw new Error("DESKTOP_ONLY: Auth flow test requires the NovaVid desktop app.");
  return await tauriInvoke<string>("youtube_test_auth_flow");
}

export async function youtubeListenForAuthCode(session: PkceSession): Promise<OAuthTokenData> {
  if (!isTauri()) throw new Error("DESKTOP_ONLY: OAuth loopback listener requires the NovaVid desktop app.");
  return await tauriInvoke<OAuthTokenData>("youtube_listen_for_auth_code", { session });
}

export async function youtubeGetJobStatus(jobId: string): Promise<PublishJobStatus | null> {
  try {
    if (!isTauri()) return null;
    return await tauriInvoke<PublishJobStatus | null>("youtube_get_job_status", { jobId });
  } catch {
    return null;
  }
}

export async function youtubeCancelUpload(jobId: string): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("youtube_cancel_upload", { jobId });
}

export async function youtubeGetChannels(): Promise<YouTubeChannelInfo[]> {
  if (!isTauri()) return [];
  try {
    return await tauriInvoke<YouTubeChannelInfo[]>("youtube_get_channels");
  } catch (err) {
    console.warn("Falling back to empty channel list:", err);
    return [];
  }
}

export async function youtubeStartUpload(
  request: PublishVideoRequest
): Promise<PublishJobStatus> {
  if (!isTauri()) throw new Error("DESKTOP_ONLY: YouTube upload requires the NovaVid desktop app.");
  return await tauriInvoke<PublishJobStatus>("youtube_start_upload", { request });
}

// ==========================================
// Phase 8: Multi-Channel & Upload Safety Gate
// ==========================================

export const YOUTUBE_DAILY_QUOTA_LIMIT = 10000;
export const QUOTA_COSTS = {
  VIDEO_UPLOAD: 1600,
  THUMBNAIL_UPLOAD: 50,
  METADATA_UPDATE: 50,
  CHANNEL_LIST: 1,
} as const;

export interface QuotaTrackerState {
  unitsUsedToday: number;
  lastResetDate: string; // YYYY-MM-DD in UTC/PST
  remainingUnits: number;
  canUploadVideo: boolean;
}

export function getDailyQuotaState(): QuotaTrackerState {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem("novavid_yt_quota_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lastResetDate === todayStr) {
        const remaining = Math.max(0, YOUTUBE_DAILY_QUOTA_LIMIT - (parsed.unitsUsedToday || 0));
        return {
          unitsUsedToday: parsed.unitsUsedToday || 0,
          lastResetDate: todayStr,
          remainingUnits: remaining,
          canUploadVideo: remaining >= QUOTA_COSTS.VIDEO_UPLOAD,
        };
      }
    }
  } catch {
    // ignore
  }

  return {
    unitsUsedToday: 0,
    lastResetDate: todayStr,
    remainingUnits: YOUTUBE_DAILY_QUOTA_LIMIT,
    canUploadVideo: true,
  };
}

export function recordQuotaConsumption(units: number): QuotaTrackerState {
  const current = getDailyQuotaState();
  const newUnits = current.unitsUsedToday + units;
  const remaining = Math.max(0, YOUTUBE_DAILY_QUOTA_LIMIT - newUnits);
  const updated: QuotaTrackerState = {
    unitsUsedToday: newUnits,
    lastResetDate: current.lastResetDate,
    remainingUnits: remaining,
    canUploadVideo: remaining >= QUOTA_COSTS.VIDEO_UPLOAD,
  };
  try {
    localStorage.setItem("novavid_yt_quota_state", JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export interface SafePublishOptions {
  projectId: string;
  channelId: string;
  videoPath: string;
  title: string;
  description?: string;
  tags?: string[];
  thumbnailPath?: string;
  privacyStatus?: "private" | "unlisted" | "public";
  madeForKids?: boolean;
  categoryId?: string;
  requireExplicitApprovalForPublic?: boolean;
}

export function createSafePublishRequest(options: SafePublishOptions): {
  request: PublishVideoRequest;
  warnings: string[];
  isValid: boolean;
} {
  const warnings: string[] = [];

  // 1. YouTube Title: Max 100 characters
  let cleanTitle = options.title.trim();
  if (cleanTitle.length > 100) {
    cleanTitle = cleanTitle.slice(0, 97) + "...";
    warnings.push("Title truncated to 100 characters to meet YouTube limits.");
  }
  if (!cleanTitle) {
    cleanTitle = "Untitled NovaVid Production";
    warnings.push("Title was empty; set to default placeholder.");
  }

  // 2. YouTube Description: Max 5000 characters
  let cleanDesc = (options.description || "").trim();
  if (cleanDesc.length > 5000) {
    cleanDesc = cleanDesc.slice(0, 4990) + "...";
    warnings.push("Description truncated to 5000 characters.");
  }

  // 3. YouTube Tags: max 500 total chars
  let tags = options.tags || [];
  let totalTagChars = tags.reduce((acc, t) => acc + t.length, 0);
  if (totalTagChars > 500) {
    const trimmedTags: string[] = [];
    let currentLength = 0;
    for (const tag of tags) {
      if (currentLength + tag.length <= 480) {
        trimmedTags.push(tag);
        currentLength += tag.length;
      }
    }
    tags = trimmedTags;
    warnings.push("Tags truncated to fit 500 character quota limit.");
  }

  // 4. Privacy Safety Gate: Default to private ALWAYS
  let privacy = options.privacyStatus || "private";
  if (privacy === "public" && options.requireExplicitApprovalForPublic !== false) {
    // Safe default override
    privacy = "private";
    warnings.push("Privacy automatically defaulted to 'private' per safety gate protocol. User explicit toggle required to release publicly.");
  }

  const request: PublishVideoRequest = {
    projectId: options.projectId,
    channelId: options.channelId,
    videoPath: options.videoPath,
    thumbnailPath: options.thumbnailPath,
    title: cleanTitle,
    description: cleanDesc,
    tags,
    privacyStatus: privacy,
    madeForKids: options.madeForKids ?? false,
    categoryId: options.categoryId || "28", // Science & Technology
  };

  const isValid = Boolean(request.projectId && request.channelId && request.videoPath);

  return {
    request,
    warnings,
    isValid,
  };
}

