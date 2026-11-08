// NovaVid AI YouTube Studio — Stage K: Commercial SaaS & Licensing Engine

export type LicenseTier = "free" | "creator" | "pro_studio" | "enterprise";
export type LicenseStatus = "active" | "expired" | "grace_period";
export type AllowedResolution = "720p" | "1080p" | "1440p" | "4k";

export interface UserLicense {
  id: string;
  licenseKey: string;
  tier: LicenseTier;
  status: LicenseStatus;
  holderName: string;
  holderEmail: string;
  deviceId: string;
  maxExportsMonthly: number;
  exportsThisMonth: number;
  maxResolution: AllowedResolution;
  watermarkRequired: boolean;
  canAutoPublish: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierPlanInfo {
  tier: LicenseTier;
  displayName: string;
  badgeColor: string;
  monthlyPriceUsd: number;
  maxResolution: AllowedResolution;
  watermarkRequired: boolean;
  maxExportsMonthly: number;
  canAutoPublish: boolean;
  aiTokenMonthlyBudget: number;
  description: string;
  features: string[];
}

export const TIER_PLANS: Record<LicenseTier, TierPlanInfo> = {
  free: {
    tier: "free",
    displayName: "Free Starter",
    badgeColor: "#64748b",
    monthlyPriceUsd: 0,
    maxResolution: "720p",
    watermarkRequired: true,
    maxExportsMonthly: 5,
    canAutoPublish: false,
    aiTokenMonthlyBudget: 15000,
    description: "Ideal for exploring AI YouTube production workflows and testing local rendering.",
    features: [
      "720p H.264 Video Export",
      "Mandatory 'NovaVid AI' Watermark",
      "5 Video Renders per Month",
      "Offline Voice (SAPI) + Standard Gemini Text",
      "Local Media & Subtitle Editor",
    ],
  },
  creator: {
    tier: "creator",
    displayName: "Creator Studio",
    badgeColor: "#3b82f6",
    monthlyPriceUsd: 19,
    maxResolution: "1080p",
    watermarkRequired: false,
    maxExportsMonthly: 30,
    canAutoPublish: true,
    aiTokenMonthlyBudget: 150000,
    description: "Designed for active YouTube creators needing crisp 1080p60 renders without watermarks.",
    features: [
      "1080p60 Full HD Export",
      "No Watermark (Clean Commercial Rights)",
      "30 Video Renders per Month",
      "Gemini TTS Neural Voices & Dual Ducking",
      "Imagen 3 AI Visual Synthesis",
      "YouTube Direct OAuth Publishing",
    ],
  },
  pro_studio: {
    tier: "pro_studio",
    displayName: "Pro Studio",
    badgeColor: "#8b5cf6",
    monthlyPriceUsd: 49,
    maxResolution: "4k",
    watermarkRequired: false,
    maxExportsMonthly: 250,
    canAutoPublish: true,
    aiTokenMonthlyBudget: 1000000,
    description: "For professional YouTube channels, agency operators, and autonomous production pipelines.",
    features: [
      "4K UHD (3840x2160) 60fps Export",
      "Unlimited Autonomous AI Agent Workflows",
      "250 Video Renders per Month",
      "Character Visual Continuity Lock",
      "YouTube Analytics Retention Diagnostics",
      "Priority API Routing & Hardware NVENC Acceleration",
    ],
  },
  enterprise: {
    tier: "enterprise",
    displayName: "Enterprise Fleet",
    badgeColor: "#f59e0b",
    monthlyPriceUsd: 199,
    maxResolution: "4k",
    watermarkRequired: false,
    maxExportsMonthly: 10000,
    canAutoPublish: true,
    aiTokenMonthlyBudget: 10000000,
    description: "For multi-channel media networks requiring multi-seat fleets and custom channel integration.",
    features: [
      "Unlimited 4K60 UHD Rendering",
      "Multi-Channel Fleet Management",
      "Dedicated High-Speed Queue",
      "Custom Watermark & Brand Profile Lock",
      "SLA Support & On-Premises Model Serving",
    ],
  },
};

export const DEFAULT_FREE_LICENSE: UserLicense = {
  id: "lic_free_default",
  licenseKey: "NOVA-FREE-COMMUNITY-2026",
  tier: "free",
  status: "active",
  holderName: "NovaVid Community Creator",
  holderEmail: "creator@novavid.studio",
  deviceId: "dev_local_windows_default",
  maxExportsMonthly: 5,
  exportsThisMonth: 0,
  maxResolution: "720p",
  watermarkRequired: true,
  canAutoPublish: false,
  expiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const RESOLUTION_HIERARCHY: Record<AllowedResolution, number> = {
  "720p": 1,
  "1080p": 2,
  "1440p": 3,
  "4k": 4,
};

/**
 * Checks whether the user's license tier allows rendering at the requested resolution.
 */
export function canExportResolution(license: UserLicense, requestedResolution: string): boolean {
  const normReq = (requestedResolution.toLowerCase().trim() as AllowedResolution) || "720p";
  const reqLevel = RESOLUTION_HIERARCHY[normReq] || 1;
  const maxLevel = RESOLUTION_HIERARCHY[license.maxResolution] || 1;
  return maxLevel >= reqLevel;
}

/**
 * Checks if the monthly export allowance has not been exceeded.
 */
export function checkExportAllowance(license: UserLicense): {
  allowed: boolean;
  remaining: number;
  reason?: string;
} {
  const remaining = Math.max(0, license.maxExportsMonthly - license.exportsThisMonth);
  if (license.exportsThisMonth >= license.maxExportsMonthly) {
    return {
      allowed: false,
      remaining: 0,
      reason: `Monthly export limit (${license.maxExportsMonthly}) reached for the ${TIER_PLANS[license.tier].displayName} plan. Upgrade to increase capacity.`,
    };
  }
  return { allowed: true, remaining };
}

/**
 * Validates a commercial license key format.
 * Format: NOVA-<TIER>-<CHARS>-<CHECKSUM>
 */
export function validateLicenseKey(key: string): {
  isValid: boolean;
  tier?: LicenseTier;
  error?: string;
} {
  const cleanKey = key.trim().toUpperCase();
  if (!cleanKey) {
    return { isValid: false, error: "License key cannot be blank." };
  }

  const parts = cleanKey.split("-");
  if (parts.length < 3 || parts[0] !== "NOVA") {
    return { isValid: false, error: "Invalid license key format. Must begin with 'NOVA-'." };
  }

  const tierKey = parts[1];
  let tier: LicenseTier;

  switch (tierKey) {
    case "FREE":
      tier = "free";
      break;
    case "CREATOR":
      tier = "creator";
      break;
    case "PRO":
    case "STUDIO":
      tier = "pro_studio";
      break;
    case "ENT":
    case "ENTERPRISE":
      tier = "enterprise";
      break;
    default:
      return { isValid: false, error: `Unrecognized license tier code: ${tierKey}` };
  }

  return { isValid: true, tier };
}

/**
 * Creates an active license object from an authorized key.
 */
export function createActivatedLicense(
  key: string,
  email: string = "creator@novavid.studio",
  name: string = "NovaVid Creator",
): UserLicense {
  const validation = validateLicenseKey(key);
  if (!validation.isValid || !validation.tier) {
    throw new Error(validation.error || "Invalid license key.");
  }

  const plan = TIER_PLANS[validation.tier];
  const now = new Date().toISOString();

  // One-year expiration from today
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 1);

  return {
    id: `lic_${Date.now()}`,
    licenseKey: key.trim().toUpperCase(),
    tier: validation.tier,
    status: "active",
    holderName: name.trim() || "NovaVid Creator",
    holderEmail: email.trim() || "creator@novavid.studio",
    deviceId: `device_win_${Date.now().toString(36)}`,
    maxExportsMonthly: plan.maxExportsMonthly,
    exportsThisMonth: 0,
    maxResolution: plan.maxResolution,
    watermarkRequired: plan.watermarkRequired,
    canAutoPublish: plan.canAutoPublish,
    expiresAt: validation.tier === "free" ? null : expDate.toISOString(),
    createdAt: now,
    updatedAt: now,
  };
}
