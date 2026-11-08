import { describe, expect, it } from "vitest";
import * as crypto from "crypto";
import {
  verifyStripeSignature,
  verifyLemonSqueezySignature,
  WebhookProcessor,
  OWNER_EMAIL,
  TIER_CREDIT_MAP,
} from "./webhookHandler";

describe("Phase 9: SaaS Billing & Webhook Security Engine", () => {
  const secret = "whsec_test_secret_key_123456789";

  it("verifies valid Stripe webhook signatures and rejects tampered payloads", () => {
    const rawBody = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${rawBody}`;
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const header = `t=${timestamp},v1=${validSignature}`;

    // Valid signature passes
    expect(verifyStripeSignature(rawBody, header, secret)).toBe(true);

    // Tampered payload fails
    expect(verifyStripeSignature(rawBody + "tampered", header, secret)).toBe(false);

    // Expired timestamp fails (> 300 seconds)
    const oldHeader = `t=${timestamp - 600},v1=${validSignature}`;
    expect(verifyStripeSignature(rawBody, oldHeader, secret)).toBe(false);
  });

  it("verifies LemonSqueezy webhook HMAC-SHA256 signatures", () => {
    const rawBody = JSON.stringify({ meta: { event_name: "order_created" } });
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    expect(verifyLemonSqueezySignature(rawBody, validSignature, secret)).toBe(true);
    expect(verifyLemonSqueezySignature(rawBody, "invalid_sig", secret)).toBe(false);
  });

  it("enforces permanent Enterprise entitlement for LODHI TECHX owner", async () => {
    const processor = new WebhookProcessor();

    const ownerEvent = {
      id: "evt_owner_test_1",
      type: "customer.subscription.deleted", // even on deletion event!
      created: Date.now(),
      data: {
        object: {
          customer_email: OWNER_EMAIL,
          client_reference_id: "lodhi-techx-owner",
          status: "canceled",
        },
      },
    };

    const result = await processor.handleSubscriptionEvent(ownerEvent);
    expect(result.isOwnerExempt).toBe(true);
    expect(result.tier).toBe("enterprise");
    expect(result.status).toBe("active");
    expect(result.monthlyCreditMinutes).toBe(TIER_CREDIT_MAP.enterprise);
    expect(result.message).toContain("LODHI TECHX Owner Entitlement");
  });

  it("processes customer subscription activation and prevents duplicate execution (idempotency)", async () => {
    const processor = new WebhookProcessor();

    const customerEvent = {
      id: "evt_cust_999",
      type: "checkout.session.completed",
      created: Date.now(),
      data: {
        object: {
          client_reference_id: "user_client_456",
          customer_email: "creator@youtube.com",
          metadata: {
            tier: "pro",
          },
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        },
      },
    };

    const firstRun = await processor.handleSubscriptionEvent(customerEvent);
    expect(firstRun.eventProcessed).toBe(true);
    expect(firstRun.tier).toBe("pro");
    expect(firstRun.monthlyCreditMinutes).toBe(300);

    // Duplicate call with same event ID should be idempotently ignored
    const secondRun = await processor.handleSubscriptionEvent(customerEvent);
    expect(secondRun.eventProcessed).toBe(false);
    expect(secondRun.message).toContain("already processed");
  });
});
