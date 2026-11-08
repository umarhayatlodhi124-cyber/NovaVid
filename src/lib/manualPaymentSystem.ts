/**
 * NovaVid AI Studio 2.0 — WhatsApp Manual Payment & Subscription Engine
 * Complete manual payment verification, screenshot upload validation,
 * WhatsApp click-to-chat message generation, and atomic subscription activation.
 * 
 * Company: LODHI TECHX
 * Founder: Umar Hayat
 * Product: NovaVid AI Studio 2.0
 */

export type ManualPaymentProviderId = "jazzcash" | "easypaisa" | "bank_transfer" | "custom";

export interface PaymentMethodConfig {
  id: ManualPaymentProviderId | string;
  name: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  qrCodeUrl?: string;
  instructions: string;
  currency: "PKR" | "USD";
  isEnabled: boolean;
}

export interface WhatsAppPaymentSettings {
  whatsappNumber: string; // e.g. "+923001234567"
  supportContactName: string;
  businessHours: string;
  paymentMethods: PaymentMethodConfig[];
}

export type PaymentRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_VERIFICATION"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface PaymentScreenshotData {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrlOrPath: string; // Base64 data URL or secure storage URI
}

export interface PaymentRequestRecord {
  id: string; // e.g. PAY-2026-041289-A7B2
  customerId: string;
  customerName: string;
  customerEmail: string;
  organizationId: string;
  planId: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  paymentMethodId: string;
  paymentMethodName: string;
  transactionReference: string;
  screenshot: PaymentScreenshotData;
  status: PaymentRequestStatus;
  rejectionReason?: string;
  adminNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  subscriptionId?: string;
  submittedAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface SubscriptionRecordState {
  id: string;
  organizationId: string;
  customerId: string;
  planId: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  billingCycle: "monthly" | "yearly";
  status: "active" | "past_due" | "canceled" | "expired";
  startDate: string;
  expiryDate: string;
  monthlyVideoMinutes: number;
  monthlyAiTokens: number;
  maxSeats: number;
  lastPaymentRequestId: string;
  activatedBy: string;
  updatedAt: string;
}

export interface PlanPricingTier {
  id: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  name: string;
  monthlyPricePkr: number;
  yearlyPricePkr: number;
  monthlyPriceUsd: number;
  videoMinutesMonthly: number;
  aiTokensMonthly: number;
  maxSeats: number;
  features: string[];
}

export const COMMERCIAL_PLAN_TIERS: Record<string, PlanPricingTier> = {
  starter: {
    id: "starter",
    name: "Free Starter",
    monthlyPricePkr: 0,
    yearlyPricePkr: 0,
    monthlyPriceUsd: 0,
    videoMinutesMonthly: 5,
    aiTokensMonthly: 15000,
    maxSeats: 1,
    features: ["720p HD Video Export", "Mandatory Watermark", "Local Offline Voice (SAPI)"],
  },
  creator_pro: {
    id: "creator_pro",
    name: "Creator Pro",
    monthlyPricePkr: 7500,
    yearlyPricePkr: 75000,
    monthlyPriceUsd: 29,
    videoMinutesMonthly: 60,
    aiTokensMonthly: 250000,
    maxSeats: 3,
    features: ["1080p60 Full HD Export", "No Watermark", "Gemini & Claude Script Engine", "ElevenLabs Neural TTS"],
  },
  agency_studio: {
    id: "agency_studio",
    name: "Agency Studio",
    monthlyPricePkr: 25000,
    yearlyPricePkr: 250000,
    monthlyPriceUsd: 99,
    videoMinutesMonthly: 300,
    aiTokensMonthly: 1000000,
    maxSeats: 10,
    features: ["4K UHD 60fps Export", "Multi-Seat Fleet (10 Seats)", "Multi-Aspect-Ratio Engine", "Priority Support"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Fleet",
    monthlyPricePkr: 50000,
    yearlyPricePkr: 500000,
    monthlyPriceUsd: 199,
    videoMinutesMonthly: 1000,
    aiTokensMonthly: 5000000,
    maxSeats: 25,
    features: ["Unlimited 4K Export", "25 Workstation Seats", "Custom Workflows", "Dedicated SLA Response"],
  },
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppPaymentSettings = {
  whatsappNumber: "+923000000000", // Default support placeholder configured via Admin
  supportContactName: "LODHI TECHX Support Desk",
  businessHours: "9:00 AM - 10:00 PM PKT (Mon-Sat)",
  paymentMethods: [
    {
      id: "jazzcash",
      name: "JazzCash Mobile Account",
      accountTitle: "LODHI TECHX",
      accountNumber: "0300-XXXXXXX",
      instructions: "Transfer the exact plan amount to the JazzCash account above, take a screenshot of the confirmation SMS or receipt, and submit it below.",
      currency: "PKR",
      isEnabled: true,
    },
    {
      id: "easypaisa",
      name: "Easypaisa Mobile Account",
      accountTitle: "LODHI TECHX",
      accountNumber: "0345-XXXXXXX",
      instructions: "Send money via Easypaisa app or shop, save the PDF receipt or screenshot with TRX ID, and upload it.",
      currency: "PKR",
      isEnabled: true,
    },
    {
      id: "bank_transfer",
      name: "Direct Online Bank Transfer (IBAN)",
      accountTitle: "LODHI TECHX PRIVATE LIMITED",
      accountNumber: "PK00XXXX0000000000000000",
      bankName: "Meezan Bank Limited / HBL",
      instructions: "Inter-bank funds transfer (IBFT) from any banking app. Enter transaction reference ID from your banking app receipt.",
      currency: "PKR",
      isEnabled: true,
    },
  ],
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class ManualPaymentSystem {
  private settings: WhatsAppPaymentSettings;
  private paymentRequests = new Map<string, PaymentRequestRecord>();
  private subscriptions = new Map<string, SubscriptionRecordState>();
  private usedTransactionReferences = new Set<string>();
  private authorizedAdminEmails: Set<string>;

  constructor(
    initialSettings: WhatsAppPaymentSettings = DEFAULT_WHATSAPP_SETTINGS,
    authorizedAdmins: string[] = ["umarhayatlodhi25@gmail.com", "umarhayatlodhi124@gmail.com"]
  ) {
    this.settings = { ...initialSettings };
    this.authorizedAdminEmails = new Set(authorizedAdmins.map((e) => e.toLowerCase()));
  }

  public getSettings(): WhatsAppPaymentSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  public updateSettings(newSettings: Partial<WhatsAppPaymentSettings>, adminEmail: string): void {
    this.assertAdminAuthorized(adminEmail);
    if (newSettings.whatsappNumber) this.settings.whatsappNumber = newSettings.whatsappNumber.trim();
    if (newSettings.supportContactName) this.settings.supportContactName = newSettings.supportContactName.trim();
    if (newSettings.businessHours) this.settings.businessHours = newSettings.businessHours.trim();
    if (newSettings.paymentMethods) this.settings.paymentMethods = [...newSettings.paymentMethods];
    this.saveToStorage();
  }

  public validateScreenshot(file: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataUrlOrPath: string;
  }): { isValid: boolean; error?: string } {
    if (!file.dataUrlOrPath || file.sizeBytes <= 0) {
      return { isValid: false, error: "Payment screenshot is empty or corrupt." };
    }

    if (file.sizeBytes > MAX_SCREENSHOT_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size exceeds the 5 MB limit (Uploaded: ${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB).`,
      };
    }

    const mime = file.mimeType.toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime)) {
      return {
        isValid: false,
        error: `Unsupported file format '${file.mimeType}'. Please upload JPG, PNG, WebP or PDF receipt.`,
      };
    }

    const ext = file.fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp", "pdf"].includes(ext)) {
      return { isValid: false, error: "Invalid file extension. Expected .jpg, .png, .webp, or .pdf." };
    }

    return { isValid: true };
  }

  public async submitPaymentRequest(params: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    organizationId: string;
    planId: "starter" | "creator_pro" | "agency_studio" | "enterprise";
    billingCycle?: "monthly" | "yearly";
    paymentMethodId: string;
    transactionReference: string;
    screenshot: PaymentScreenshotData;
  }): Promise<{ success: boolean; request?: PaymentRequestRecord; error?: string }> {
    // 1. Validate Screenshot
    const valResult = this.validateScreenshot(params.screenshot);
    if (!valResult.isValid) {
      return { success: false, error: valResult.error };
    }

    // 2. Validate Payment Method
    const method = this.settings.paymentMethods.find(
      (m) => m.id === params.paymentMethodId && m.isEnabled
    );
    if (!method) {
      return { success: false, error: "The selected payment method is invalid or currently disabled." };
    }

    // 3. Validate Plan
    const plan = COMMERCIAL_PLAN_TIERS[params.planId];
    if (!plan) {
      return { success: false, error: "Selected plan does not exist." };
    }

    // 4. Duplicate Transaction Reference Detection
    const cleanTrx = params.transactionReference.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 4) {
      return { success: false, error: "A valid transaction reference / TRX ID is required." };
    }

    if (this.usedTransactionReferences.has(cleanTrx)) {
      return {
        success: false,
        error: `Transaction reference '${cleanTrx}' has already been submitted. Please check your payment history or contact support.`,
      };
    }

    // 5. Calculate Amount
    const billingCycle = params.billingCycle || "monthly";
    const amount = billingCycle === "yearly" ? plan.yearlyPricePkr : plan.monthlyPricePkr;

    // 6. Generate Unique Payment Request ID
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const requestId = `PAY-2026-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const record: PaymentRequestRecord = {
      id: requestId,
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      organizationId: params.organizationId,
      planId: params.planId,
      billingCycle,
      amount,
      currency: method.currency,
      paymentMethodId: method.id,
      paymentMethodName: method.name,
      transactionReference: cleanTrx,
      screenshot: params.screenshot,
      status: "PENDING_VERIFICATION",
      submittedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
    };

    this.paymentRequests.set(requestId, record);
    this.usedTransactionReferences.add(cleanTrx);
    this.saveToStorage();

    return { success: true, request: record };
  }

  public generateWhatsAppUrl(request: PaymentRequestRecord): {
    whatsappUrl: string;
    prefilledMessage: string;
  } {
    const cleanNumber = this.settings.whatsappNumber.replace(/[^0-9]/g, "");
    const plan = COMMERCIAL_PLAN_TIERS[request.planId]?.name || request.planId.toUpperCase();

    const prefilledMessage = [
      `Hello ${this.settings.supportContactName},`,
      ``,
      `I have submitted a manual subscription payment request for NovaVid AI Studio 2.0:`,
      `• Request ID: ${request.id}`,
      `• Plan: ${plan} (${request.billingCycle.toUpperCase()})`,
      `• Amount: ${request.amount.toLocaleString()} ${request.currency}`,
      `• Payment Method: ${request.paymentMethodName}`,
      `• Transaction Reference: ${request.transactionReference}`,
      `• Customer: ${request.customerName} (${request.customerEmail})`,
      `• Organization: ${request.organizationId}`,
      ``,
      `My payment receipt screenshot is attached in this chat.`,
      `Please verify and activate my subscription.`,
    ].join("\n");

    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(prefilledMessage)}`;

    return { whatsappUrl, prefilledMessage };
  }

  public async approvePayment(params: {
    requestId: string;
    adminEmail: string;
    adminNotes?: string;
  }): Promise<{ success: boolean; subscription?: SubscriptionRecordState; error?: string }> {
    this.assertAdminAuthorized(params.adminEmail);

    const req = this.paymentRequests.get(params.requestId);
    if (!req) {
      return { success: false, error: "Payment request not found." };
    }

    // Customer cannot approve their own payment
    if (req.customerEmail.toLowerCase() === params.adminEmail.toLowerCase()) {
      return { success: false, error: "Security violation: Customers cannot approve their own payment requests." };
    }

    // Atomic guard: Prevent duplicate approval
    if (req.status === "APPROVED") {
      return { success: false, error: "This payment request has already been approved." };
    }

    if (req.status === "CANCELLED" || req.status === "REJECTED") {
      return { success: false, error: `Cannot approve request in '${req.status}' state.` };
    }

    const now = new Date();
    const durationDays = req.billingCycle === "yearly" ? 365 : 30;
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const plan = COMMERCIAL_PLAN_TIERS[req.planId];
    const subId = `sub-manual-${req.organizationId}-${Date.now()}`;

    const subscription: SubscriptionRecordState = {
      id: subId,
      organizationId: req.organizationId,
      customerId: req.customerId,
      planId: req.planId,
      billingCycle: req.billingCycle,
      status: "active",
      startDate: now.toISOString(),
      expiryDate,
      monthlyVideoMinutes: plan.videoMinutesMonthly,
      monthlyAiTokens: plan.aiTokensMonthly,
      maxSeats: plan.maxSeats,
      lastPaymentRequestId: req.id,
      activatedBy: params.adminEmail,
      updatedAt: now.toISOString(),
    };

    // Atomic update
    req.status = "APPROVED";
    req.approvedBy = params.adminEmail;
    req.approvedAt = now.toISOString();
    req.subscriptionId = subId;
    req.adminNotes = params.adminNotes || "Approved via Admin SaaS WhatsApp verification.";
    req.updatedAt = now.toISOString();

    this.subscriptions.set(req.organizationId, subscription);
    this.saveToStorage();

    return { success: true, subscription };
  }

  public async rejectPayment(params: {
    requestId: string;
    adminEmail: string;
    reason: string;
    adminNotes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.assertAdminAuthorized(params.adminEmail);

    if (!params.reason || params.reason.trim().length < 5) {
      return { success: false, error: "A detailed rejection reason is required." };
    }

    const req = this.paymentRequests.get(params.requestId);
    if (!req) {
      return { success: false, error: "Payment request not found." };
    }

    if (req.status === "APPROVED") {
      return { success: false, error: "Cannot reject an already approved payment request." };
    }

    req.status = "REJECTED";
    req.rejectionReason = params.reason.trim();
    req.adminNotes = params.adminNotes;
    req.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return { success: true };
  }

  public async cancelPayment(requestId: string, customerId: string): Promise<{ success: boolean; error?: string }> {
    const req = this.paymentRequests.get(requestId);
    if (!req) {
      return { success: false, error: "Payment request not found." };
    }

    if (req.customerId !== customerId) {
      return { success: false, error: "Unauthorized: You can only cancel your own payment requests." };
    }

    if (req.status !== "PENDING_VERIFICATION" && req.status !== "SUBMITTED") {
      return { success: false, error: `Cannot cancel a request with status '${req.status}'.` };
    }

    req.status = "CANCELLED";
    req.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return { success: true };
  }

  public getPaymentRequest(requestId: string): PaymentRequestRecord | null {
    const r = this.paymentRequests.get(requestId);
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }

  public listRequestsByOrg(orgId: string): PaymentRequestRecord[] {
    return Array.from(this.paymentRequests.values())
      .filter((r) => r.organizationId === orgId)
      .map((r) => JSON.parse(JSON.stringify(r)));
  }

  public listAllRequestsForAdmin(adminEmail: string): PaymentRequestRecord[] {
    this.assertAdminAuthorized(adminEmail);
    return Array.from(this.paymentRequests.values()).map((r) => JSON.parse(JSON.stringify(r)));
  }

  public getSubscriptionForOrg(orgId: string): SubscriptionRecordState | null {
    const s = this.subscriptions.get(orgId);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  private assertAdminAuthorized(email: string): void {
    if (!email || !this.authorizedAdminEmails.has(email.toLowerCase())) {
      throw new Error(`Access Denied: Email '${email}' is not an authorized administrator.`);
    }
  }

  public saveToStorage(): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem("novavid_whatsapp_settings", JSON.stringify(this.settings));
      localStorage.setItem("novavid_manual_payments", JSON.stringify(Array.from(this.paymentRequests.entries())));
      localStorage.setItem("novavid_manual_subscriptions", JSON.stringify(Array.from(this.subscriptions.entries())));
      localStorage.setItem("novavid_used_trx_refs", JSON.stringify(Array.from(this.usedTransactionReferences)));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  public loadFromStorage(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const s = localStorage.getItem("novavid_whatsapp_settings");
      if (s) this.settings = JSON.parse(s);

      const p = localStorage.getItem("novavid_manual_payments");
      if (p) {
        const arr = JSON.parse(p);
        this.paymentRequests = new Map(arr);
      }

      const subs = localStorage.getItem("novavid_manual_subscriptions");
      if (subs) {
        const arr = JSON.parse(subs);
        this.subscriptions = new Map(arr);
      }

      const refs = localStorage.getItem("novavid_used_trx_refs");
      if (refs) {
        const arr = JSON.parse(refs);
        this.usedTransactionReferences = new Set(arr);
      }
    } catch {
      // Ignore corrupted stored data
    }
  }

  public resetForTesting(): void {
    this.paymentRequests.clear();
    this.subscriptions.clear();
    this.usedTransactionReferences.clear();
  }
}

export const manualPaymentService = new ManualPaymentSystem();
if (typeof window !== "undefined") {
  manualPaymentService.loadFromStorage();
}
