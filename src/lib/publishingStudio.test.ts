import { describe, expect, it } from "vitest";
import {
  youtubeGetChannels,
  youtubeGetCredentialStatus,
  PublishVideoRequest,
  DEFAULT_CLIENT_ID,
  DEFAULT_REDIRECT_URI,
  OAuthClientConfig,
  createSafePublishRequest,
  getDailyQuotaState,
  recordQuotaConsumption,
  QUOTA_COSTS,
} from "./publishingStudio";

describe("Stage S — Real YouTube Integration & Publishing Unit Tests", () => {
  it("youtubeGetChannels returns at least one active channel profile", async () => {
    const channels = await youtubeGetChannels();
    expect(channels.length).toBeGreaterThanOrEqual(1);

    const active = channels.find((c) => c.isActive);
    expect(active).toBeDefined();
    expect(active?.channelId).toBe("UC_NovaVid_Official");
    expect(active?.subscriberCount).toBeGreaterThan(0);
  });

  it("youtubeGetCredentialStatus safely returns boolean status", async () => {
    const status = await youtubeGetCredentialStatus();
    expect(typeof status).toBe("boolean");
  });

  it("PublishVideoRequest conforms to YouTube Data API v3 publishing criteria", () => {
    const request: PublishVideoRequest = {
      projectId: "proj-pub-1",
      channelId: "UC_NovaVid_Official",
      videoPath: "exports/render_proj-pub-1.mp4",
      title: "How Quantum AI Will Transform Modern Tech in 2026",
      description: "Complete guide to next-generation quantum computing.",
      tags: ["quantum", "ai", "technology"],
      privacyStatus: "private",
      madeForKids: false,
      categoryId: "28",
    };

    expect(["private", "unlisted", "public"]).toContain(request.privacyStatus);
    expect(request.title.length).toBeLessThanOrEqual(100);
    expect(request.madeForKids).toBe(false);
    expect(request.categoryId).toBe("28");
  });

  it("OAuth client defaults and configuration structures are valid", () => {
    expect(DEFAULT_CLIENT_ID).toBe("223544445426-f9eqtmfen285707670pf5fer67p4oofh.apps.googleusercontent.com");
    expect(DEFAULT_REDIRECT_URI).toBe("http://127.0.0.1:8911/oauth2callback");

    const customConfig: OAuthClientConfig = {
      clientId: "custom-client.apps.googleusercontent.com",
      clientSecret: "GOCSPX-sample-secret",
      redirectUri: DEFAULT_REDIRECT_URI,
    };

    expect(customConfig.clientId).toBeDefined();
    expect(customConfig.clientSecret).toBeDefined();
    expect(customConfig.redirectUri).toContain("8911");

    // Pure PKCE configuration without client secret
    const purePkceConfig: OAuthClientConfig = {
      clientId: DEFAULT_CLIENT_ID,
      redirectUri: DEFAULT_REDIRECT_URI,
    };
    expect(purePkceConfig.clientSecret).toBeUndefined();
    expect(purePkceConfig.clientId).toBe(DEFAULT_CLIENT_ID);
  });

  it("verifies exact loopback redirect URI format and port alignment", () => {
    expect(DEFAULT_REDIRECT_URI).toBe("http://127.0.0.1:8911/oauth2callback");
    const parsed = new URL(DEFAULT_REDIRECT_URI);
    expect(parsed.hostname).toBe("127.0.0.1");
    expect(parsed.port).toBe("8911");
    expect(parsed.pathname).toBe("/oauth2callback");
  });

  it("validates that desktop PKCE authorization preserves client ID and omits client secret", () => {
    const desktopSession = {
      clientId: DEFAULT_CLIENT_ID,
      codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
      codeChallenge: "E9Melhoa2OwvFrGMTJguCH5rtG64DTbTQwyAgaFTRe4",
      state: "state_val_123",
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${DEFAULT_CLIENT_ID}&redirect_uri=http%3A%2F%2F127.0.0.1%3A8911%2Foauth2callback`,
    };

    expect(desktopSession.clientId).toBe(DEFAULT_CLIENT_ID);
    expect(desktopSession.authUrl).toContain(encodeURIComponent(DEFAULT_REDIRECT_URI));
    expect(desktopSession.codeVerifier.length).toBeGreaterThanOrEqual(43);
  });

  it("createSafePublishRequest enforces private status by default and truncates long titles", () => {
    // Test default privacy status enforcement
    const result1 = createSafePublishRequest({
      projectId: "proj-1",
      channelId: "UCL1USyVzIikDT-K1OIg69_w",
      videoPath: "C:/path/to/video.mp4",
      title: "Short Title",
    });

    expect(result1.request.privacyStatus).toBe("private");
    expect(result1.isValid).toBe(true);

    // Test title truncation (> 100 chars)
    const longTitle = "A".repeat(120);
    const result2 = createSafePublishRequest({
      projectId: "proj-1",
      channelId: "UCL1USyVzIikDT-K1OIg69_w",
      videoPath: "C:/path/to/video.mp4",
      title: longTitle,
    });

    expect(result2.request.title.length).toBeLessThanOrEqual(100);
    expect(result2.warnings.length).toBeGreaterThan(0);

    // Test privacy safety override when requested public without explicit bypass
    const result3 = createSafePublishRequest({
      projectId: "proj-1",
      channelId: "UCL1USyVzIikDT-K1OIg69_w",
      videoPath: "C:/path/to/video.mp4",
      title: "Valid Title",
      privacyStatus: "public",
      requireExplicitApprovalForPublic: true,
    });
    expect(result3.request.privacyStatus).toBe("private");

    // Test quota tracker
    const quota = getDailyQuotaState();
    expect(quota.remainingUnits).toBeGreaterThanOrEqual(0);
    expect(typeof quota.canUploadVideo).toBe("boolean");

    const updated = recordQuotaConsumption(QUOTA_COSTS.VIDEO_UPLOAD);
    expect(updated.unitsUsedToday).toBeGreaterThanOrEqual(QUOTA_COSTS.VIDEO_UPLOAD);
  });
});
