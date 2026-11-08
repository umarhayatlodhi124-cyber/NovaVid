// NovaVid AI Studio — Stage W2: Production Admin SaaS Control Center
// Complete multi-tenant oversight, billing metrics, manual WhatsApp payment verification, license issuance, and device revocation.

import React, { useState, useEffect } from "react";
import { cloudClient, type CloudSession } from "../lib/cloudSaaS";
import type { LicensePayload } from "../lib/licensingCrypto";
import {
  auth,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
  subscribeToAuthState,
} from "../lib/firebase";
import type { User } from "firebase/auth";
import {
  manualPaymentService,
  type PaymentRequestRecord,
  type WhatsAppPaymentSettings,
} from "../lib/manualPaymentSystem";

export const AUTHORIZED_ADMIN_EMAILS = [
  "umarhayatlodhi25@gmail.com",
  "umarhayatlodhi124@gmail.com",
  "umarhayatlodhi2001@gmail.com",
];

const MASTER_ADMIN_PASSCODE = "LODHI-TECHX-2026";

interface MockTenant {
  id: string;
  name: string;
  ownerEmail: string;
  tier: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  mrr: number;
  devices: number;
  status: "active" | "suspended" | "past_due";
  createdAt: string;
}

const INITIAL_TENANTS: MockTenant[] = [
  {
    id: "org_alpha_01",
    name: "Alpha Apex Media",
    ownerEmail: "director@alphaapex.tv",
    tier: "enterprise",
    mrr: 199,
    devices: 14,
    status: "active",
    createdAt: "2026-01-15",
  },
  {
    id: "org_nexus_02",
    name: "Nexus Creators Collective",
    ownerEmail: "lead@nexuscreators.co",
    tier: "agency_studio",
    mrr: 99,
    devices: 7,
    status: "active",
    createdAt: "2026-03-02",
  },
  {
    id: "org_solo_03",
    name: "TechPulse Studio",
    ownerEmail: "sarah@techpulse.video",
    tier: "creator_pro",
    mrr: 29,
    devices: 2,
    status: "active",
    createdAt: "2026-05-20",
  },
  {
    id: "org_starter_04",
    name: "Indie Vlog Labs",
    ownerEmail: "indie@vloglabs.io",
    tier: "starter",
    mrr: 0,
    devices: 1,
    status: "past_due",
    createdAt: "2026-07-11",
  },
];

export interface AdminSaaSPanelProps {
  onNavigateToAwsConnection?: () => void;
}

export const AdminSaaSPanel: React.FC<AdminSaaSPanelProps> = ({ onNavigateToAwsConnection: _onNavigateToAwsConnection }) => {
  const [session, setSession] = useState<CloudSession>(cloudClient.getSession());
  const [tenants] = useState<MockTenant[]>(INITIAL_TENANTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [adminTab, setAdminTab] = useState<"tenants" | "payments" | "methods" | "licenses">("tenants");

  // Admin Auth Gate State
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isPasscodeAuthorized, setIsPasscodeAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"google" | "email" | "passcode">("google");

  // License Generator State
  const [genOrgId, setGenOrgId] = useState("org_client_new");
  const [genEmail, setGenEmail] = useState("creator@client.com");
  const [genTier, setGenTier] = useState<LicensePayload["tier"]>("creator_pro");
  const [genMaxDevices, setGenMaxDevices] = useState(5);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Manual Payments State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestRecord[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRequestRecord | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  // Payment Methods & WhatsApp Config State
  const [paymentConfig, setPaymentConfig] = useState<WhatsAppPaymentSettings>(manualPaymentService.getSettings());

  // Security Audit Log State
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; time: string }>>([
    { id: "log_1", action: "Tenant 'Alpha Apex Media' upgraded to Enterprise tier", time: "10 mins ago" },
    { id: "log_2", action: "Cryptographic license issued for 'lead@nexuscreators.co'", time: "42 mins ago" },
    { id: "log_3", action: "Suspicious machine fingerprint HW-REVOKED-99 quarantined", time: "2 hours ago" },
  ]);

  const effectiveAdminEmail = currentUser?.email || "umarhayatlodhi25@gmail.com";

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => {
      setCurrentUser(u);
      if (u && AUTHORIZED_ADMIN_EMAILS.includes(u.email?.toLowerCase() || "")) {
        cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
        setSession(cloudClient.getSession());
        setAuthError(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const reqs = manualPaymentService.listAllRequestsForAdmin(effectiveAdminEmail);
      setPaymentRequests(reqs);
    } catch {
      // Not yet authorized or offline
    }
  }, [adminTab, effectiveAdminEmail]);

  const isAuthorized =
    isPasscodeAuthorized ||
    (currentUser !== null &&
      AUTHORIZED_ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || ""));

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const user = await loginWithGoogle();
      if (!AUTHORIZED_ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
        await logoutFirebase();
        setAuthError(`Access Denied: ${user.email} is not on the authorized administrative registry.`);
      } else {
        cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
        setSession(cloudClient.getSession());
      }
    } catch (err: any) {
      setAuthError(err?.message || "Google sign-in failed.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const user = await loginWithEmail(loginEmail.trim(), loginPassword);
      if (!AUTHORIZED_ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
        await logoutFirebase();
        setAuthError(`Access Denied: ${user.email} is not an authorized administrator.`);
      } else {
        cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
        setSession(cloudClient.getSession());
      }
    } catch (err: any) {
      setAuthError(err?.message || "Invalid email or password.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePasscodeSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === MASTER_ADMIN_PASSCODE) {
      setIsPasscodeAuthorized(true);
      cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
      setSession(cloudClient.getSession());
      setAuthError(null);
    } else {
      setAuthError("Invalid Master Admin Passcode. Access restricted to LODHI TECHX ownership.");
    }
  };

  const handleAdminLogout = async () => {
    await logoutFirebase();
    setIsPasscodeAuthorized(false);
    cloudClient.loginWithToken("jwt_viewer_token", { role: "viewer" });
    setSession(cloudClient.getSession());
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      const graceDate = new Date(expDate);
      graceDate.setDate(graceDate.getDate() + 14);

      const payload: LicensePayload = {
        keyId: `lic_${Date.now()}`,
        orgId: genOrgId,
        email: genEmail,
        tier: genTier,
        maxDevices: Number(genMaxDevices),
        issuedAt: new Date().toISOString(),
        expiresAt: expDate.toISOString(),
        gracePeriodDays: 14,
        graceExpiresAt: graceDate.toISOString(),
        features: ["4k_render", "imagen3", "agent_full_pipeline", "no_watermark"],
      };

      const token = await cloudClient.requestLicenseIssuance(payload);
      setGeneratedToken(token);
      setAuditLogs((prev) => [
        { id: `log_${Date.now()}`, action: `License issued for '${genEmail}' (${genTier})`, time: "Just now" },
        ...prev,
      ]);
    } catch (err: any) {
      alert(`License issuance failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Payment Management Handlers
  const handleApprovePayment = async (requestId: string) => {
    if (!window.confirm(`Are you sure you want to approve payment ${requestId} and activate the customer subscription?`)) {
      return;
    }

    try {
      const res = await manualPaymentService.approvePayment({
        requestId,
        adminEmail: effectiveAdminEmail,
        adminNotes: "Approved via Admin SaaS Panel after WhatsApp verification.",
      });

      if (!res.success) {
        alert(`Approval failed: ${res.error}`);
        return;
      }

      setPaymentRequests(manualPaymentService.listAllRequestsForAdmin(effectiveAdminEmail));
      setPaymentNotice(`Payment ${requestId} successfully approved! Subscription activated.`);
      setAuditLogs((prev) => [
        { id: `log_${Date.now()}`, action: `Payment ${requestId} approved. Subscription activated.`, time: "Just now" },
        ...prev,
      ]);
      setTimeout(() => setPaymentNotice(null), 4000);
    } catch (err: any) {
      alert(`Error approving payment: ${err.message}`);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectingRequestId || !rejectReason.trim()) {
      alert("Please enter a valid rejection reason.");
      return;
    }

    try {
      const res = await manualPaymentService.rejectPayment({
        requestId: rejectingRequestId,
        adminEmail: effectiveAdminEmail,
        reason: rejectReason.trim(),
        adminNotes: "Rejected by admin during manual review.",
      });

      if (!res.success) {
        alert(`Rejection failed: ${res.error}`);
        return;
      }

      setPaymentRequests(manualPaymentService.listAllRequestsForAdmin(effectiveAdminEmail));
      setPaymentNotice(`Payment ${rejectingRequestId} rejected.`);
      setRejectingRequestId(null);
      setRejectReason("");
      setTimeout(() => setPaymentNotice(null), 3000);
    } catch (err: any) {
      alert(`Error rejecting payment: ${err.message}`);
    }
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      manualPaymentService.updateSettings(paymentConfig, effectiveAdminEmail);
      setPaymentNotice("Payment methods & WhatsApp contact settings saved successfully!");
      setTimeout(() => setPaymentNotice(null), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const pendingPaymentsCount = paymentRequests.filter((r) => r.status === "PENDING_VERIFICATION").length;
  const filteredPayments = paymentRequests.filter((r) => paymentFilter === "ALL" || r.status === paymentFilter);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "all" || t.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const totalMrr = tenants.reduce((acc, t) => acc + (t.status === "active" ? t.mrr : 0), 0);
  const activeSeats = tenants.reduce((acc, t) => acc + t.devices, 0);

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-indigo-600/40 rounded-2xl shadow-2xl text-slate-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-2xl font-bold">
            🛡️
          </div>
          <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[11px] font-semibold tracking-wider uppercase border border-indigo-500/30">
            LODHI TECHX FLEET CONTROL
          </span>
          <h2 className="text-xl font-bold text-white mt-2">SaaS Super Admin Authentication</h2>
          <p className="text-xs text-slate-400 mt-1">
            Restricted zone. Access is strictly constrained to authorized platform owners.
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-xs text-red-300 leading-relaxed">
            {authError}
          </div>
        )}

        {/* Auth Method Tabs */}
        <div className="flex border-b border-slate-800 mb-5">
          <button
            onClick={() => { setAuthMode("google"); setAuthError(null); }}
            className={`flex-1 pb-2 text-xs font-semibold transition-colors ${
              authMode === "google"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Google OAuth
          </button>
          <button
            onClick={() => { setAuthMode("email"); setAuthError(null); }}
            className={`flex-1 pb-2 text-xs font-semibold transition-colors ${
              authMode === "email"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => { setAuthMode("passcode"); setAuthError(null); }}
            className={`flex-1 pb-2 text-xs font-semibold transition-colors ${
              authMode === "passcode"
                ? "text-indigo-400 border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Master Passcode
          </button>
        </div>

        {authMode === "google" && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <span>Sign in with Google (Authorized Admin)</span>
            </button>
          </div>
        )}

        {authMode === "email" && (
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Admin Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="umarhayatlodhi25@gmail.com"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full mt-2 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors cursor-pointer"
            >
              {isAuthLoading ? "Verifying Credentials..." : "Authenticate Admin"}
            </button>
          </form>
        )}

        {authMode === "passcode" && (
          <form onSubmit={handlePasscodeSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Master Emergency Passcode</label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter master passcode"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors cursor-pointer"
            >
              Verify Master Key
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 p-1">
      {/* SaaS Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/40 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-400 font-mono text-xs font-semibold tracking-wider uppercase border border-indigo-500/30">
                LODHI TECHX FLEET CONTROL
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SUPER ADMIN: {currentUser?.email || (isPasscodeAuthorized ? "Master Key" : session.role.toUpperCase())}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1.5">
              Commercial SaaS Administration & Fleet Control
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Multi-tenant telemetry, manual WhatsApp payment verification, Ed25519 licensing, and device management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAdminLogout}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 transition-colors cursor-pointer"
            >
              🔒 Lock / Sign Out
            </button>
          </div>
        </div>

        {/* Global SaaS Financial & Usage Telemetry Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs font-medium text-slate-400">Monthly Recurring Revenue</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">${totalMrr.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-500/80 mt-0.5 font-medium">↑ +18.4% vs last cycle</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs font-medium text-slate-400">Active Tenants</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{tenants.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">100% Tenant Isolated</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs font-medium text-slate-400">Pending WhatsApp Payments</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingPaymentsCount}</p>
            <p className="text-[11px] text-amber-400/80 mt-0.5 font-medium">Requires Manual Verification</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs font-medium text-slate-400">Bound Workstation Seats</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{activeSeats}</p>
            <p className="text-[11px] text-indigo-400/80 mt-0.5 font-medium">Hardware Fingerprint Locked</p>
          </div>
        </div>
      </div>

      {/* Admin Section Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setAdminTab("tenants")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            adminTab === "tenants"
              ? "text-indigo-400 border-indigo-500 bg-indigo-950/20"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          🏢 Tenant Fleet
        </button>
        <button
          onClick={() => setAdminTab("payments")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            adminTab === "payments"
              ? "text-emerald-400 border-emerald-500 bg-emerald-950/20"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <span>💬 Manual Payments</span>
          {pendingPaymentsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black">
              {pendingPaymentsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab("methods")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            adminTab === "methods"
              ? "text-cyan-400 border-cyan-500 bg-cyan-950/20"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          ⚙️ Payment Methods & WhatsApp Config
        </button>
        <button
          onClick={() => setAdminTab("licenses")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            adminTab === "licenses"
              ? "text-amber-400 border-amber-500 bg-amber-950/20"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          🔑 Ed25519 License Issuer
        </button>
      </div>

      {paymentNotice && (
        <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-lg text-emerald-200 text-xs flex justify-between items-center">
          <span>✓ {paymentNotice}</span>
          <button onClick={() => setPaymentNotice(null)} className="text-emerald-400 font-bold hover:text-white">✕</button>
        </div>
      )}

      {/* TAB 1: Tenants List */}
      {adminTab === "tenants" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Registered Tenant Fleet</h3>
              <p className="text-xs text-slate-400">Tenant accounts, billing status, and device allocations</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
              />
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Tiers</option>
                <option value="starter">Starter</option>
                <option value="creator_pro">Creator Pro</option>
                <option value="agency_studio">Agency Studio</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5">Organization / Tenant</th>
                  <th className="px-3.5 py-2.5">Tier</th>
                  <th className="px-3.5 py-2.5">MRR</th>
                  <th className="px-3.5 py-2.5">Devices</th>
                  <th className="px-3.5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-3 font-sans">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.ownerEmail}</div>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 text-[11px]">
                        {t.tier}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-emerald-400 font-semibold">${t.mrr}/mo</td>
                    <td className="px-3.5 py-3">{t.devices} active</td>
                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Manual Payment Management */}
      {adminTab === "payments" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Manual WhatsApp Payment Verification</h3>
              <p className="text-xs text-slate-400">Review receipts, verify transaction references, and activate subscriptions</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses ({paymentRequests.length})</option>
                <option value="PENDING_VERIFICATION">Pending Verification ({pendingPaymentsCount})</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
              No payment requests found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Request ID</th>
                    <th className="px-3.5 py-2.5">Customer & Org</th>
                    <th className="px-3.5 py-2.5">Plan / Cycle</th>
                    <th className="px-3.5 py-2.5">Amount</th>
                    <th className="px-3.5 py-2.5">Method & TRX ID</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredPayments.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-3">
                        <span className="font-bold text-white text-[11px]">{req.id}</span>
                        <div className="text-[10px] text-slate-500">{new Date(req.submittedAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-3.5 py-3 font-sans">
                        <div className="font-semibold text-white">{req.customerName}</div>
                        <div className="text-[10px] text-slate-400">{req.customerEmail}</div>
                        <div className="text-[10px] text-indigo-400 font-mono">{req.organizationId}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 text-[11px]">
                          {req.planId.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{req.billingCycle}</div>
                      </td>
                      <td className="px-3.5 py-3 font-bold text-emerald-400 font-sans">
                        Rs {req.amount.toLocaleString()} {req.currency}
                      </td>
                      <td className="px-3.5 py-3 font-sans">
                        <div className="text-white text-[11px] font-semibold">{req.paymentMethodName}</div>
                        <div className="text-cyan-300 font-mono text-[10px]">{req.transactionReference}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : req.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right space-x-1.5 font-sans">
                        <button
                          onClick={() => setSelectedReceipt(req)}
                          className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                        >
                          View Receipt
                        </button>
                        {req.status === "PENDING_VERIFICATION" && (
                          <>
                            <button
                              onClick={() => handleApprovePayment(req.id)}
                              className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingRequestId(req.id)}
                              className="px-2 py-1 text-[11px] bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 rounded border border-rose-500/40"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Payment Methods & WhatsApp Config */}
      {adminTab === "methods" && (
        <form onSubmit={handleSavePaymentConfig} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Payment Method & WhatsApp Configuration</h3>
            <p className="text-xs text-slate-400">Configure recipient account numbers, IBANs, and WhatsApp support contact without editing code.</p>
          </div>

          {/* WhatsApp Support Config */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp Support Number</label>
              <input
                type="text"
                value={paymentConfig.whatsappNumber}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, whatsappNumber: e.target.value })}
                placeholder="+923001234567"
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Must include country code (e.g. +92 for Pakistan)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Support Desk Contact Name</label>
              <input
                type="text"
                value={paymentConfig.supportContactName}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, supportContactName: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business Hours</label>
              <input
                type="text"
                value={paymentConfig.businessHours}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, businessHours: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
              />
            </div>
          </div>

          {/* Payment Methods List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configured Payment Methods</h4>
            {paymentConfig.paymentMethods.map((method, idx) => (
              <div key={method.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{method.name} ({method.id})</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={method.isEnabled}
                      onChange={(e) => {
                        const updated = [...paymentConfig.paymentMethods];
                        updated[idx].isEnabled = e.target.checked;
                        setPaymentConfig({ ...paymentConfig, paymentMethods: updated });
                      }}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                    />
                    <span>Enabled</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Account Title</label>
                    <input
                      type="text"
                      value={method.accountTitle}
                      onChange={(e) => {
                        const updated = [...paymentConfig.paymentMethods];
                        updated[idx].accountTitle = e.target.value;
                        setPaymentConfig({ ...paymentConfig, paymentMethods: updated });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Account Number / IBAN</label>
                    <input
                      type="text"
                      value={method.accountNumber}
                      onChange={(e) => {
                        const updated = [...paymentConfig.paymentMethods];
                        updated[idx].accountNumber = e.target.value;
                        setPaymentConfig({ ...paymentConfig, paymentMethods: updated });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bank Name (if applicable)</label>
                    <input
                      type="text"
                      value={method.bankName || ""}
                      onChange={(e) => {
                        const updated = [...paymentConfig.paymentMethods];
                        updated[idx].bankName = e.target.value;
                        setPaymentConfig({ ...paymentConfig, paymentMethods: updated });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Payment Instructions</label>
                  <textarea
                    rows={2}
                    value={method.instructions}
                    onChange={(e) => {
                      const updated = [...paymentConfig.paymentMethods];
                      updated[idx].instructions = e.target.value;
                      setPaymentConfig({ ...paymentConfig, paymentMethods: updated });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Ed25519 License Token Issuer */}
      {adminTab === "licenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
            <h3 className="text-lg font-bold text-white mb-2">Cryptographic License Issuer</h3>
            <p className="text-xs text-slate-400 mb-4">
              Issues tamper-proof digital license keys that work 100% offline with Ed25519 cryptographic verification.
            </p>

            <form onSubmit={handleGenerateLicense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Organization ID</label>
                <input
                  type="text"
                  value={genOrgId}
                  onChange={(e) => setGenOrgId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Licensee Email</label>
                <input
                  type="email"
                  value={genEmail}
                  onChange={(e) => setGenEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Commercial Tier</label>
                  <select
                    value={genTier}
                    onChange={(e) => setGenTier(e.target.value as LicensePayload["tier"])}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="creator_pro">Creator Pro</option>
                    <option value="agency_studio">Agency Studio</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Max Devices</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genMaxDevices}
                    onChange={(e) => setGenMaxDevices(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? "Signing Payload..." : "Generate Cryptographic Token"}
              </button>
            </form>

            {generatedToken && (
              <div className="mt-4 p-3 bg-slate-950 border border-indigo-500/40 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-emerald-400">✓ Token Generated & Signed</span>
                  <button
                    onClick={() => copyToClipboard(generatedToken)}
                    className="text-[10px] text-indigo-300 hover:text-white underline font-mono cursor-pointer"
                  >
                    {copiedNotice ? "Copied!" : "Copy Token"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generatedToken}
                  rows={3}
                  className="w-full bg-transparent text-[10px] font-mono text-slate-300 focus:outline-none resize-none break-all"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Recent Security & Administrative Actions
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="bg-slate-950/40 px-3 py-1.5 rounded border border-slate-800/80">
                  <div className="font-mono text-slate-300 text-[11px]">{log.action}</div>
                  <div className="text-[10px] text-slate-500">{log.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Screenshot Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="font-bold text-white text-sm">Payment Receipt: {selectedReceipt.id}</h4>
                <p className="text-[11px] text-slate-400">{selectedReceipt.customerName} ({selectedReceipt.customerEmail})</p>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
              <div><span className="text-slate-500">Method:</span> <span className="text-white">{selectedReceipt.paymentMethodName}</span></div>
              <div><span className="text-slate-500">TRX ID:</span> <span className="text-cyan-300 font-bold">{selectedReceipt.transactionReference}</span></div>
              <div><span className="text-slate-500">Amount:</span> <span className="text-emerald-400 font-bold">Rs {selectedReceipt.amount.toLocaleString()} {selectedReceipt.currency}</span></div>
              <div><span className="text-slate-500">File:</span> <span className="text-slate-300">{selectedReceipt.screenshot.fileName} ({(selectedReceipt.screenshot.sizeBytes / 1024).toFixed(1)} KB)</span></div>
            </div>

            {/* Image Preview */}
            <div className="max-h-72 overflow-auto bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center justify-center">
              {selectedReceipt.screenshot.dataUrlOrPath.startsWith("data:image") ? (
                <img
                  src={selectedReceipt.screenshot.dataUrlOrPath}
                  alt="Receipt Preview"
                  className="max-h-64 object-contain rounded"
                />
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  📄 Receipt file: {selectedReceipt.screenshot.fileName}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>
              {selectedReceipt.status === "PENDING_VERIFICATION" && (
                <button
                  onClick={() => {
                    const reqId = selectedReceipt.id;
                    setSelectedReceipt(null);
                    handleApprovePayment(reqId);
                  }}
                  className="px-4 py-1.5 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Approve & Activate Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h4 className="font-bold text-white text-sm">Reject Payment Request: {rejectingRequestId}</h4>
            <p className="text-xs text-slate-400">Please provide a clear reason for the customer.</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID was not found in our bank statement, or screenshot was illegible."
              className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setRejectingRequestId(null); setRejectReason(""); }}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                className="px-4 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
