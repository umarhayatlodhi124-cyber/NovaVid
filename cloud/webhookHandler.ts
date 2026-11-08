import * as crypto from "crypto";

export interface WebhookEventPayload {
  id: string;
  type: string;
  created: number;
  data: {
    object: Record<string, any>;
  };
}

export interface SubscriptionUpdateResult {
  userId: string;
  tier: "free" | "starter" | "creator" | "pro" | "business" | "enterprise";
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd: number;
  monthlyCreditMinutes: number;
  isOwnerExempt: boolean;
  eventProcessed: boolean;
  message: string;
}

export const TIER_CREDIT_MAP: Record<string, number> = {
  free: 5,
  starter: 30,
  creator: 120,
  pro: 300,
  business: 800,
  enterprise: 999999, // Unmetered
};

export const OWNER_EMAIL = "umarhayatlodhi25@gmail.com";

/**
 * Validates Stripe HMAC-SHA256 webhook signatures
 */
export function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): boolean {
  if (!rawBody || !sigHeader || !secret) return false;

  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.trim().split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) return false;

  // Prevent replay attacks (tolerance: 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSig, "hex")
  );
}

/**
 * Validates LemonSqueezy HMAC-SHA256 signature
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): boolean {
  if (!rawBody || !sigHeader || !secret) return false;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sigHeader, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

export class WebhookProcessor {
  private processedEvents = new Set<string>();

  /**
   * Process a verified Stripe or LemonSqueezy subscription webhook event
   */
  public async handleSubscriptionEvent(
    event: WebhookEventPayload
  ): Promise<SubscriptionUpdateResult> {
    if (this.processedEvents.has(event.id)) {
      return {
        userId: "",
        tier: "free",
        status: "active",
        currentPeriodEnd: 0,
        monthlyCreditMinutes: 0,
        isOwnerExempt: false,
        eventProcessed: false,
        message: `Event ${event.id} already processed (idempotent ignore)`,
      };
    }

    this.processedEvents.add(event.id);
    const obj = event.data.object;
    const userEmail = (obj.customer_email || obj.email || "").toLowerCase();
    const userId = obj.client_reference_id || obj.metadata?.userId || obj.customer || "unknown_user";

    // Permanent Owner Protection Rule: LODHI TECHX
    if (userEmail === OWNER_EMAIL || userId === "lodhi-techx-owner") {
      return {
        userId,
        tier: "enterprise",
        status: "active",
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 315360000, // 10 years
        monthlyCreditMinutes: TIER_CREDIT_MAP.enterprise,
        isOwnerExempt: true,
        message: "LODHI TECHX Owner Entitlement: Permanent Enterprise tier preserved.",
      };
    }

    let tier: "free" | "starter" | "creator" | "pro" | "business" | "enterprise" = "free";
    let status: "active" | "past_due" | "canceled" | "trialing" = "active";
    let periodEnd = obj.current_period_end || Math.floor(Date.now() / 1000) + 2592000;

    const priceId = obj.items?.data?.[0]?.price?.id || obj.price_id || obj.plan?.id || "";
    if (priceId.includes("starter") || obj.metadata?.tier === "starter") tier = "starter";
    else if (priceId.includes("creator") || obj.metadata?.tier === "creator") tier = "creator";
    else if (priceId.includes("pro") || obj.metadata?.tier === "pro") tier = "pro";
    else if (priceId.includes("business") || obj.metadata?.tier === "business") tier = "business";
    else if (priceId.includes("enterprise") || obj.metadata?.tier === "enterprise") tier = "enterprise";
    else tier = "creator"; // default paid tier

    if (event.type === "customer.subscription.deleted" || event.type === "subscription_cancelled") {
      status = "canceled";
      tier = "free";
    } else if (event.type === "invoice.payment_failed") {
      status = "past_due";
    }

    const credits = TIER_CREDIT_MAP[tier] || 5;

    return {
      userId,
      tier,
      status,
      currentPeriodEnd: periodEnd,
      monthlyCreditMinutes: credits,
      isOwnerExempt: false,
      eventProcessed: true,
      message: `User ${userId} successfully updated to ${tier} (${status})`,
    };
  }
}
