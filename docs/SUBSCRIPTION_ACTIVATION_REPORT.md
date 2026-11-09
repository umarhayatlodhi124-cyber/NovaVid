# NOVAVID AI STUDIO 2.0
# SUBSCRIPTION ACTIVATION & ENTITLEMENT REPORT

**Company:** LODHI TECHX  
**Founder:** Umar Hayat  
**Release Tag:** `v2.0.2-commercial-whatsapp`  
**Verified in Suite:** `src/lib/manualPaymentAndFinalLaunch.test.ts` (Tests 11, 12, 13, 14, 15)

---

## 1. Plan Entitlements & Pricing Structure

| Plan Tier | Monthly Price (PKR) | Yearly Price (PKR) | Video Rendering Quota | AI Generation Tokens | Workstation Seats | Resolution & Export |
|---|---|---|---|---|---|---|
| **Free Starter** | PKR 0 | PKR 0 | 5 mins / month | 15,000 tokens | 1 Device | 720p HD (Watermarked) |
| **Creator Pro** | PKR 7,500 | PKR 75,000 | 60 mins / month | 250,000 tokens | 3 Devices | 1080p60 Full HD (No Watermark) |
| **Agency Studio** | PKR 25,000 | PKR 250,000 | 300 mins / month | 1,000,000 tokens | 10 Devices | 4K UHD 60fps (Multi-Aspect) |
| **Enterprise Fleet** | PKR 50,000 | PKR 500,000 | 1,000 mins / month | 5,000,000 tokens | 25 Devices | Unlimited 4K + Priority Queue |

---

## 2. Expiry Calculation Logic

Upon admin approval, the subscription expiration timestamp is calculated precisely from the approval epoch:
- **Monthly Billing Cycle:** `startDate + (30 * 24 * 60 * 60 * 1000)` (Exactly 30 Days).
- **Yearly Billing Cycle:** `startDate + (365 * 24 * 60 * 60 * 1000)` (Exactly 365 Days).

```typescript
const now = new Date();
const durationDays = req.billingCycle === "yearly" ? 365 : 30;
const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
```

---

## 3. Quota & Seat Synchronization

When `approvePayment` succeeds, the customer's tenant organization receives:
1. `status: "active"`
2. `monthlyVideoMinutes: plan.videoMinutesMonthly`
3. `monthlyAiTokens: plan.aiTokensMonthly`
4. `maxSeats: plan.maxSeats`
5. `lastPaymentRequestId: req.id`
6. `activatedBy: adminEmail`

### Multi-Tenant Isolation
All subscription lookups are scoped strictly by `organizationId`:
- `getActiveSubscription(orgId)` returns only the subscription matching that workspace.
- Cross-tenant requests return `null`, preventing cross-workspace entitlement leakage.
