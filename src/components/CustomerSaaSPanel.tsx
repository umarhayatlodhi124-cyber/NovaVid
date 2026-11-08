// NovaVid AI Studio — Stage W3: Production Customer SaaS Self-Service Portal
// Creator subscription oversight, device hardware unbinding, manual WhatsApp payment & screenshot verification.

import React, { useState, useEffect } from "react";
import { TIER_PLANS, type LicenseTier } from "../lib/licensingStudio";
import {
  manualPaymentService,
  COMMERCIAL_PLAN_TIERS,
  type PaymentRequestRecord,
} from "../lib/manualPaymentSystem";

interface BoundDevice {
  id: string;
  fingerprint: string;
  hostname: string;
  os: string;
  lastActive: string;
  isCurrent: boolean;
}

const INITIAL_DEVICES: BoundDevice[] = [
  {
    id: "dev_1",
    fingerprint: "HW-WIN11-D4A8-771B",
    hostname: "DESKTOP-UMAR-PC",
    os: "Windows 11 Pro x64",
    lastActive: "Active Now",
    isCurrent: true,
  },
  {
    id: "dev_2",
    fingerprint: "HW-WIN10-B1C2-990E",
    hostname: "LAPTOP-STUDIO-MOBILE",
    os: "Windows 10 Home x64",
    lastActive: "3 days ago",
    isCurrent: false,
  },
];

export interface CustomerSaaSPanelProps {
  onNavigateToAwsConnection?: () => void;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  organizationId?: string;
}

export const CustomerSaaSPanel: React.FC<CustomerSaaSPanelProps> = ({
  onNavigateToAwsConnection: _onNavigateToAwsConnection,
  customerId = "cust-user-default",
  customerName = "NovaVid Creator",
  customerEmail = "creator@novavid.studio",
  organizationId = "org-novavid-user",
}) => {
  const [currentTier, setCurrentTier] = useState<LicenseTier>("creator");
  const [devices, setDevices] = useState<BoundDevice[]>(INITIAL_DEVICES);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Manual WhatsApp Payment State
  const [selectedPlanId, setSelectedPlanId] = useState<"starter" | "creator_pro" | "agency_studio" | "enterprise">("creator_pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("jazzcash");
  const [trxReference, setTrxReference] = useState("");
  const [screenshotData, setScreenshotData] = useState<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataUrlOrPath: string;
  } | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<PaymentRequestRecord | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRequestRecord[]>([]);

  const settings = manualPaymentService.getSettings();
  const plan = TIER_PLANS[currentTier];

  useEffect(() => {
    // Check if subscription was activated
    const sub = manualPaymentService.getSubscriptionForOrg(organizationId);
    if (sub && sub.status === "active") {
      const tierMap: Record<string, LicenseTier> = {
        starter: "free",
        creator_pro: "creator",
        agency_studio: "pro_studio",
        enterprise: "enterprise",
      };
      if (tierMap[sub.planId]) {
        setCurrentTier(tierMap[sub.planId]);
      }
    }
    // Load payment history
    const requests = manualPaymentService.listRequestsByOrg(organizationId);
    setPaymentHistory(requests);
  }, [organizationId]);

  const handleUnbindDevice = (id: string, hostname: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setActionNotice(`Successfully released activation seat for ${hostname}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScreenshotError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setScreenshotError("Screenshot file size must be less than 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setScreenshotData({
        fileName: file.name,
        mimeType: file.type || "image/png",
        sizeBytes: file.size,
        dataUrlOrPath: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotData) {
      setScreenshotError("Please upload a receipt screenshot before submitting.");
      return;
    }

    if (!trxReference.trim() || trxReference.trim().length < 4) {
      setScreenshotError("Please provide a valid transaction reference / TRX ID.");
      return;
    }

    setIsSubmittingPayment(true);
    setScreenshotError(null);

    try {
      const res = await manualPaymentService.submitPaymentRequest({
        customerId,
        customerName,
        customerEmail,
        organizationId,
        planId: selectedPlanId,
        billingCycle,
        paymentMethodId: selectedMethodId,
        transactionReference: trxReference,
        screenshot: screenshotData,
      });

      if (!res.success || !res.request) {
        setScreenshotError(res.error || "Payment submission failed.");
        setIsSubmittingPayment(false);
        return;
      }

      setSubmittedRequest(res.request);
      setPaymentHistory(manualPaymentService.listRequestsByOrg(organizationId));
      setActionNotice(`Payment request ${res.request.id} submitted for verification!`);
      setIsSubmittingPayment(false);
    } catch (err: any) {
      setScreenshotError(err?.message || "An unexpected error occurred.");
      setIsSubmittingPayment(false);
    }
  };

  const handleCancelPayment = async (reqId: string) => {
    const res = await manualPaymentService.cancelPayment(reqId, customerId);
    if (res.success) {
      setPaymentHistory(manualPaymentService.listRequestsByOrg(organizationId));
      setActionNotice(`Payment request ${reqId} has been cancelled.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const maxSeats = currentTier === "enterprise" ? 20 : currentTier === "pro_studio" ? 5 : 2;
  const activeMethod = settings.paymentMethods.find((m) => m.id === selectedMethodId) || settings.paymentMethods[0];

  return (
    <div className="space-y-6 text-slate-100 p-1">
      {/* Customer Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/60 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-xs font-semibold tracking-wider uppercase border border-blue-500/30">
                Customer Subscription Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Subscription ({plan.displayName})
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              Subscription & Multi-Device Entitlements
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage your commercial license tier, active workstation authorizations, and monthly AI generation quotas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowUpgradeModal(true);
                setSubmittedRequest(null);
                setScreenshotError(null);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors flex items-center gap-1.5"
            >
              <span>💬 Upgrade / WhatsApp Manual Payment</span>
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="mt-4 p-2.5 bg-emerald-950/80 border border-emerald-600/50 rounded-lg text-emerald-200 text-xs flex items-center justify-between">
            <span>✓ {actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-emerald-400 font-bold hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Main Grid: Subscription Info + Usage Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Tier Details & Active Hardware Activations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Plan Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-medium">Active Commercial Plan</span>
                <h3 className="text-xl font-black text-white mt-0.5">{plan.displayName}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white">${plan.monthlyPriceUsd}</span>
                <span className="text-xs text-slate-400"> / month</span>
                <p className="text-[11px] text-slate-500">Manual WhatsApp Billing Verified</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Max Resolution</span>
                <span className="text-white font-bold text-sm mt-0.5 block">{plan.maxResolution.toUpperCase()}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Watermark Policy</span>
                <span className="text-emerald-400 font-bold text-sm mt-0.5 block">
                  {plan.watermarkRequired ? "Watermarked" : "100% Commercial Clean"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">YouTube Direct Publishing</span>
                <span className="text-blue-400 font-bold text-sm mt-0.5 block">
                  {plan.canAutoPublish ? "Enabled (OAuth 2.0)" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Bound Workstation Hardware Seats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white">Authorized Workstation Devices</h3>
                <p className="text-xs text-slate-400">
                  {devices.length} of {maxSeats} allowed hardware activations in use
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                {maxSeats - devices.length} Seats Free
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`p-3.5 rounded-lg border flex items-center justify-between ${
                    device.isCurrent
                      ? "bg-indigo-950/20 border-indigo-500/40"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{device.hostname}</span>
                      {device.isCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                          THIS PC
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {device.fingerprint} • {device.os}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Last active: {device.lastActive}</div>
                  </div>

                  {!device.isCurrent && (
                    <button
                      onClick={() => handleUnbindDevice(device.id, device.hostname)}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
                    >
                      Unbind Machine
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Quotas & Payment Request History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Monthly Usage Quotas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Usage Quotas</h3>
              <p className="text-xs text-slate-400">Track your current generation allocation</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">AI Text & Research Tokens</span>
                <span className="text-slate-400 font-mono">
                  54,200 / {plan.aiTokenMonthlyBudget.toLocaleString()} (36%)
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: "36%" }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">Video Render Allowance</span>
                <span className="text-slate-400 font-mono">
                  7 / {plan.maxExportsMonthly} renders (23%)
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: "23%" }}></div>
              </div>
            </div>
          </div>

          {/* Payment History & Request Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-white mb-2">Payment Verification Status</h3>
            <p className="text-xs text-slate-400 mb-4">Your submitted manual payment requests</p>

            {paymentHistory.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
                No payment requests submitted yet. Click "Upgrade / WhatsApp Manual Payment" above to start.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {paymentHistory.map((req) => (
                  <div key={req.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-[11px]">{req.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : req.status === "REJECTED"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : req.status === "CANCELLED"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {req.planId.toUpperCase()} • {req.amount.toLocaleString()} {req.currency} via {req.paymentMethodName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Ref: {req.transactionReference} • {new Date(req.submittedAt).toLocaleDateString()}
                    </div>
                    {req.rejectionReason && (
                      <div className="text-[11px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-800/40">
                        Reason: {req.rejectionReason}
                      </div>
                    )}
                    {req.status === "PENDING_VERIFICATION" && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => {
                            const { whatsappUrl } = manualPaymentService.generateWhatsAppUrl(req);
                            window.open(whatsappUrl, "_blank");
                          }}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          💬 Open WhatsApp
                        </button>
                        <button
                          onClick={() => handleCancelPayment(req.id)}
                          className="text-[11px] text-slate-500 hover:text-rose-400"
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Payment & WhatsApp Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Manual Payment & Subscription</h3>
                <p className="text-xs text-slate-400">Pay via JazzCash, Easypaisa, or Bank Transfer and confirm on WhatsApp</p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {submittedRequest ? (
              // Submission Success & WhatsApp Action Screen
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl text-emerald-400">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-white">Payment Request Submitted!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your request ID is <span className="font-mono text-emerald-400 font-bold">{submittedRequest.id}</span>.
                  Your receipt screenshot is uploaded. Please click below to open WhatsApp and share your receipt with our support team to activate your plan.
                </p>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs text-slate-300 max-w-md mx-auto space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan:</span>
                    <span className="text-white font-bold">{submittedRequest.planId.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="text-emerald-400 font-bold">{submittedRequest.amount.toLocaleString()} {submittedRequest.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method:</span>
                    <span>{submittedRequest.paymentMethodName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TRX ID:</span>
                    <span className="text-cyan-300 font-bold">{submittedRequest.transactionReference}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      const { whatsappUrl } = manualPaymentService.generateWhatsAppUrl(submittedRequest);
                      window.open(whatsappUrl, "_blank");
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>💬 Open WhatsApp with Pre-filled Message</span>
                  </button>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Close Window
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  * Note: WhatsApp will open with your details. Please manually attach your receipt screenshot in the chat.
                </p>
              </div>
            ) : (
              // Payment Submission Form
              <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
                {screenshotError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-lg text-rose-300">
                    {screenshotError}
                  </div>
                )}

                {/* 1. Plan & Billing Cycle Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-white">Select Plan</label>
                    <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          billingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle("yearly")}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          billingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-slate-400"
                        }`}
                      >
                        Yearly (Save 17%)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {(["creator_pro", "agency_studio", "enterprise"] as const).map((tierKey) => {
                      const p = COMMERCIAL_PLAN_TIERS[tierKey];
                      const price = billingCycle === "yearly" ? p.yearlyPricePkr : p.monthlyPricePkr;
                      const isSelected = selectedPlanId === tierKey;
                      return (
                        <div
                          key={tierKey}
                          onClick={() => setSelectedPlanId(tierKey)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="text-base font-black text-emerald-400 mt-1">
                            Rs {price.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.videoMinutesMonthly}m Video • {p.maxSeats} Seats
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Payment Method Selection & Account Details */}
                <div>
                  <label className="font-semibold text-white block mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {settings.paymentMethods
                      .filter((m) => m.isEnabled)
                      .map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            selectedMethodId === method.id
                              ? "bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="font-bold text-white text-[11px]">{method.name}</div>
                          <div className="text-[10px] text-slate-400">{method.currency}</div>
                        </button>
                      ))}
                  </div>

                  {/* Active Account Info Box */}
                  <div className="mt-3 p-3.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Account Title:</span>
                      <span className="font-bold text-white">{activeMethod.accountTitle}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Account Number / IBAN:</span>
                      <span className="font-mono font-bold text-emerald-400">{activeMethod.accountNumber}</span>
                    </div>
                    {activeMethod.bankName && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Bank Name:</span>
                        <span className="text-slate-200">{activeMethod.bankName}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      ℹ️ {activeMethod.instructions}
                    </div>
                  </div>
                </div>

                {/* 3. Transaction Reference & Screenshot Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-white block mb-1.5">
                      Transaction Reference / TRX ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={trxReference}
                      onChange={(e) => setTrxReference(e.target.value)}
                      placeholder="e.g. TRX-9823412 or Bank Ref"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-white block mb-1.5">
                      Payment Screenshot / Receipt <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="w-full text-slate-400 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                      required
                    />
                  </div>
                </div>

                {/* Screenshot Preview */}
                {screenshotData && (
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">📄</span>
                      <span className="text-slate-300 font-medium truncate max-w-xs">{screenshotData.fileName}</span>
                      <span className="text-slate-500 text-[10px]">({(screenshotData.sizeBytes / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenshotData(null)}
                      className="text-slate-500 hover:text-rose-400 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingPayment ? "Submitting..." : "Submit Payment Request →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
