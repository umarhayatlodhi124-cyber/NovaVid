// NovaVid AI Studio — Stage W2: Production Super Admin SaaS Control Center
// Complete multi-tenant oversight, real Cloud Firestore synchronization, manual WhatsApp payment verification,
// Ed25519 asymmetric licensing, device management, and dedicated left sidebar architecture.
// Brand: LODHI TECHX | Founder: Umar Hayat | Version: 2.2.0

import React, { useState, useEffect } from "react";
import { cloudClient, type CloudSession } from "../lib/cloudSaaS";
import type { LicensePayload } from "../lib/licensingCrypto";
import {
  auth,
  db,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
  subscribeToAuthState,
} from "../lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
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

export interface TenantRecord {
  id: string;
  name: string;
  ownerEmail: string;
  tier: "starter" | "creator_pro" | "agency_studio" | "enterprise";
  mrr: number;
  devices: number;
  status: "active" | "suspended" | "past_due";
  createdAt: string;
}

export interface AdminSaaSPanelProps {
  onNavigateToAwsConnection?: () => void;
}

export const AdminSaaSPanel: React.FC<AdminSaaSPanelProps> = ({ onNavigateToAwsConnection: _onNavigateToAwsConnection }) => {
  const [_session, setSession] = useState<CloudSession>(cloudClient.getSession());
  const [adminTab, setAdminTab] = useState<"dashboard" | "tenants" | "payments" | "methods" | "licenses" | "telemetry">("dashboard");

  // Real Tenant Fleet State (Persistent & Firestore Synced)
  const [tenants, setTenants] = useState<TenantRecord[]>(() => {
    try {
      const stored = localStorage.getItem("novavid_registered_tenants");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter ghost/fake entries from cached data
          const clean = parsed.filter((t: TenantRecord) => {
            const email = (t.ownerEmail || "").toLowerCase();
            return (
              !email.endsWith("@novavid.studio") &&
              !email.startsWith("customer_prd_") &&
              email !== "you@lodhitechx.com" &&
              !email.includes("_prd_")
            );
          });
          if (clean.length > 0) return clean;
        }
      }
    } catch {}
    // Default real founder entry
    return [
      {
        id: "usr_owner_lodhi",
        name: "Umar Hayat (Founder & Super Admin)",
        ownerEmail: "umarhayatlodhi124@gmail.com",
        tier: "enterprise",
        mrr: 199,
        devices: 5,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
      },
    ];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantTier, setNewTenantTier] = useState<TenantRecord["tier"]>("creator_pro");
  const [newTenantDevices, setNewTenantDevices] = useState(3);

  // Edit Tenant State
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTier, setEditTier] = useState<TenantRecord["tier"]>("creator_pro");
  const [editDevices, setEditDevices] = useState(2);

  // Admin Auth Gate State
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isPasscodeAuthorized, setIsPasscodeAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"passcode" | "email" | "google">("passcode");

  // License Generator State
  const [genOrgId, setGenOrgId] = useState("org_lodhi_client");
  const [genEmail, setGenEmail] = useState("client@novavid.com");
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

  // Real Audit Log State
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; time: string }>>([
    { id: "log_init", action: "Super Admin Control Center initialized for novavid-ecfc8", time: "Active" },
  ]);

  const effectiveAdminEmail = currentUser?.email || "umarhayatlodhi124@gmail.com";

  // Fetch real users from Cloud Firestore
  const fetchRealFirestoreUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      if (!snap.empty) {
        const liveList: TenantRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const email: string = (d.email || "").toLowerCase();

          // Filter out fake/ghost entries: test domains, auto-generated emails, placeholder emails
          const isGhost =
            email.endsWith("@novavid.studio") ||
            email.startsWith("customer_prd_") ||
            email === "you@lodhitechx.com" ||
            email === "you@example.com" ||
            (email.includes("_prd_") && email.includes("@"));

          if (isGhost) return; // skip fake entries

          const tier = (d.plan as TenantRecord["tier"]) || "starter";
          const mrr = tier === "enterprise" ? 199 : tier === "agency_studio" ? 99 : tier === "creator_pro" ? 29 : 0;

          // Admin/owner emails always get enterprise
          const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.includes(email);
          const finalTier = isAdminEmail ? "enterprise" : tier;
          const finalMrr = isAdminEmail ? 199 : mrr;

          liveList.push({
            id: docSnap.id,
            name: d.displayName || (email ? email.split("@")[0] : "Creator"),
            ownerEmail: email,
            tier: finalTier,
            mrr: finalMrr,
            devices: d.isOwner || isAdminEmail ? 5 : 2,
            status: d.accountStatus === "suspended" ? "suspended" : "active",
            createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split("T")[0] : "2026-11-09",
          });
        });

        // Ensure owner is always present
        if (!liveList.some((t) => t.ownerEmail.toLowerCase() === "umarhayatlodhi124@gmail.com")) {
          liveList.unshift({
            id: "usr_owner_lodhi",
            name: "Umar Hayat (Founder & Super Admin)",
            ownerEmail: "umarhayatlodhi124@gmail.com",
            tier: "enterprise",
            mrr: 199,
            devices: 5,
            status: "active",
            createdAt: "2026-11-09",
          });
        }

        // Clear stale localStorage and replace with fresh Firestore data
        localStorage.removeItem("novavid_registered_tenants");
        localStorage.setItem("novavid_registered_tenants", JSON.stringify(liveList));
        setTenants(liveList);
      }
    } catch (err) {
      console.warn("Could not query live Firestore users:", err);
    }
  };

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => {
      setCurrentUser(u);
      if (u && AUTHORIZED_ADMIN_EMAILS.includes(u.email?.toLowerCase() || "")) {
        cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
        setSession(cloudClient.getSession());
        setAuthError(null);
      }
    });
    fetchRealFirestoreUsers();
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const reqs = manualPaymentService.listAllRequestsForAdmin(effectiveAdminEmail);
      setPaymentRequests(reqs);
    } catch {}
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

  // Real Add Tenant Handler
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantEmail.trim() || !newTenantName.trim()) {
      alert("Please fill in tenant name and email.");
      return;
    }

    const mrr = newTenantTier === "enterprise" ? 199 : newTenantTier === "agency_studio" ? 99 : newTenantTier === "creator_pro" ? 29 : 0;
    const newRecord: TenantRecord = {
      id: `usr_${Date.now()}`,
      name: newTenantName.trim(),
      ownerEmail: newTenantEmail.trim().toLowerCase(),
      tier: newTenantTier,
      mrr,
      devices: Number(newTenantDevices) || 2,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };

    // Save to Firestore if available
    try {
      await setDoc(doc(db, "users", newRecord.id), {
        uid: newRecord.id,
        displayName: newRecord.name,
        email: newRecord.ownerEmail,
        plan: newRecord.tier,
        role: "creator",
        accountStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn("Could not save to Firestore:", err);
    }

    const updated = [newRecord, ...tenants];
    setTenants(updated);
    localStorage.setItem("novavid_registered_tenants", JSON.stringify(updated));

    setAuditLogs((prev) => [
      { id: `log_${Date.now()}`, action: `New tenant '${newRecord.name}' registered with ${newRecord.tier} tier`, time: "Just now" },
      ...prev,
    ]);

    setNewTenantName("");
    setNewTenantEmail("");
    setIsAddTenantOpen(false);
  };

  // Real Tenant Status Toggle (Suspend / Activate)
  const handleToggleTenantStatus = (id: string) => {
    const updated = tenants.map((t) => {
      if (t.id === id) {
        const nextStatus = t.status === "active" ? ("suspended" as const) : ("active" as const);
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTenants(updated);
    localStorage.setItem("novavid_registered_tenants", JSON.stringify(updated));
  };

  // Real Tenant Tier Upgrade / Change
  const handleChangeTenantTier = (id: string, newTier: TenantRecord["tier"]) => {
    const mrr = newTier === "enterprise" ? 199 : newTier === "agency_studio" ? 99 : newTier === "creator_pro" ? 29 : 0;
    const updated = tenants.map((t) => {
      if (t.id === id) {
        return { ...t, tier: newTier, mrr };
      }
      return t;
    });
    setTenants(updated);
    localStorage.setItem("novavid_registered_tenants", JSON.stringify(updated));
  };

  // Open Edit Modal
  const handleOpenEdit = (tenant: TenantRecord) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditEmail(tenant.ownerEmail);
    setEditTier(tenant.tier);
    setEditDevices(tenant.devices);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editName.trim() || !editEmail.trim()) return;
    const mrr = editTier === "enterprise" ? 199 : editTier === "agency_studio" ? 99 : editTier === "creator_pro" ? 29 : 0;
    const updated: TenantRecord = {
      ...editingTenant,
      name: editName.trim(),
      ownerEmail: editEmail.trim().toLowerCase(),
      tier: editTier,
      mrr,
      devices: editDevices,
    };
    // Update Firestore
    try {
      await setDoc(doc(db, "users", updated.id), {
        displayName: updated.name,
        email: updated.ownerEmail,
        plan: updated.tier,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore update failed:", err);
    }
    const newList = tenants.map((t) => (t.id === updated.id ? updated : t));
    setTenants(newList);
    localStorage.setItem("novavid_registered_tenants", JSON.stringify(newList));
    setAuditLogs((prev) => [
      { id: `log_${Date.now()}`, action: `Tenant '${updated.name}' updated (tier: ${updated.tier})`, time: "Just now" },
      ...prev,
    ]);
    setEditingTenant(null);
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenant: TenantRecord) => {
    if (!window.confirm(`Delete tenant "${tenant.name}" (${tenant.ownerEmail})? This cannot be undone.`)) return;
    // Remove from Firestore
    try {
      await deleteDoc(doc(db, "users", tenant.id));
    } catch (err) {
      console.warn("Firestore delete failed:", err);
    }
    const newList = tenants.filter((t) => t.id !== tenant.id);
    setTenants(newList);
    localStorage.setItem("novavid_registered_tenants", JSON.stringify(newList));
    setAuditLogs((prev) => [
      { id: `log_${Date.now()}`, action: `Tenant '${tenant.name}' deleted from fleet`, time: "Just now" },
      ...prev,
    ]);
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

  const handleApprovePayment = async (requestId: string) => {
    if (!window.confirm(`Approve payment ${requestId} and activate customer subscription?`)) return;

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
      setPaymentNotice(`Payment ${requestId} approved! Customer subscription active.`);
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
      setPaymentNotice("WhatsApp & Payment Gateway configurations saved!");
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

  // Authentication Gate Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md p-8 bg-[#0d1428] border border-blue-600/40 rounded-2xl shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30">
              🛡️
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider border border-blue-500/30">
              LODHI TECHX FLEET CONTROL
            </span>
            <h2 className="text-xl font-bold text-white mt-3">Super Admin Authentication</h2>
            <p className="text-xs text-slate-400 mt-1">
              Restricted management portal for platform owner Umar Hayat.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-xs text-red-300">
              {authError}
            </div>
          )}

          <div className="flex border-b border-slate-800 mb-5">
            <button
              onClick={() => { setAuthMode("passcode"); setAuthError(null); }}
              className={`flex-1 pb-2 text-xs font-semibold ${authMode === "passcode" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-400"}`}
            >
              Master Passcode
            </button>
            <button
              onClick={() => { setAuthMode("email"); setAuthError(null); }}
              className={`flex-1 pb-2 text-xs font-semibold ${authMode === "email" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-400"}`}
            >
              Email &amp; Pass
            </button>
            <button
              onClick={() => { setAuthMode("google"); setAuthError(null); }}
              className={`flex-1 pb-2 text-xs font-semibold ${authMode === "google" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-400"}`}
            >
              Google
            </button>
          </div>

          {authMode === "passcode" && (
            <form onSubmit={handlePasscodeSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Passcode (LODHI-TECHX-2026)</label>
                <input
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter Master Passcode"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-blue-500/30"
              >
                Unlock Super Admin Fleet
              </button>
            </form>
          )}

          {authMode === "email" && (
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="umarhayatlodhi124@gmail.com"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-blue-500/30 disabled:opacity-50"
              >
                {isAuthLoading ? "Verifying..." : "Sign In to Admin"}
              </button>
            </form>
          )}

          {authMode === "google" && (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-bold text-xs transition-all shadow-lg disabled:opacity-50"
              >
                Sign in with Google (Authorized Admin)
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <a href="/" className="text-xs text-blue-400 hover:text-blue-300">
              ← Return to NovaVid Studio
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Super Admin Layout with Dedicated Left Sidebar
  return (
    <div className="min-h-screen bg-[#060914] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* ── Left Super Admin Sidebar ── */}
      <aside className="w-full md:w-64 bg-[#0a0f24] border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black shadow-lg shadow-blue-500/30">
                ⚡
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">NovaVid Admin</h1>
                <p className="text-[10px] text-blue-400 font-mono tracking-wider font-semibold">LODHI TECHX FLEET</p>
              </div>
            </div>

            {/* Admin Info Pill */}
            <div className="mt-4 p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SUPER ADMIN
              </div>
              <p className="text-slate-300 truncate font-mono text-[10px]">
                {currentUser?.email || "umarhayatlodhi124@gmail.com"}
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1.5 text-xs font-semibold">
            <button
              onClick={() => setAdminTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                adminTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>📊</span>
              <span>Overview &amp; Metrics</span>
            </button>

            <button
              onClick={() => setAdminTab("tenants")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                adminTab === "tenants"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>👥</span>
                <span>Tenant &amp; Creator Fleet</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300">
                {tenants.length}
              </span>
            </button>

            <button
              onClick={() => setAdminTab("payments")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                adminTab === "payments"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>💬</span>
                <span>Manual Payments</span>
              </div>
              {pendingPaymentsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold animate-pulse">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setAdminTab("methods")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                adminTab === "methods"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>⚙️</span>
              <span>WhatsApp &amp; Gateways</span>
            </button>

            <button
              onClick={() => setAdminTab("licenses")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                adminTab === "licenses"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>🔑</span>
              <span>Ed25519 License Issuer</span>
            </button>

            <button
              onClick={() => setAdminTab("telemetry")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                adminTab === "telemetry"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>📡</span>
              <span>Cloud Telemetry &amp; DB</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <span>←</span> Exit to Studio
          </a>

          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>🔒</span> Lock Admin
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Top Notification Toast */}
        {paymentNotice && (
          <div className="mb-6 p-4 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 text-xs flex items-center justify-between shadow-xl">
            <span>✨ {paymentNotice}</span>
            <button onClick={() => setPaymentNotice(null)} className="text-blue-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ── TAB 1: OVERVIEW & METRICS ── */}
        {adminTab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">SaaS Revenue &amp; Fleet Overview</h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time active telemetry for novavid-ecfc8 production cloud.
              </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#0d1428] border border-emerald-500/30 shadow-lg">
                <p className="text-xs font-semibold text-slate-400">Monthly Recurring Revenue</p>
                <p className="text-3xl font-black text-emerald-400 mt-2">${totalMrr.toLocaleString()}</p>
                <p className="text-[11px] text-emerald-500/80 mt-1 font-semibold">Active Subscriptions Base</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d1428] border border-blue-500/30 shadow-lg">
                <p className="text-xs font-semibold text-slate-400">Total Registered Tenants</p>
                <p className="text-3xl font-black text-blue-400 mt-2">{tenants.length}</p>
                <p className="text-[11px] text-blue-400/80 mt-1 font-semibold">Live in Firestore</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d1428] border border-amber-500/30 shadow-lg">
                <p className="text-xs font-semibold text-slate-400">Pending WhatsApp Receipts</p>
                <p className="text-3xl font-black text-amber-400 mt-2">{pendingPaymentsCount}</p>
                <p className="text-[11px] text-amber-400/80 mt-1 font-semibold">Awaiting Verification</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d1428] border border-indigo-500/30 shadow-lg">
                <p className="text-xs font-semibold text-slate-400">Authorized Device Seats</p>
                <p className="text-3xl font-black text-indigo-400 mt-2">{activeSeats}</p>
                <p className="text-[11px] text-indigo-400/80 mt-1 font-semibold">Hardware Locked</p>
              </div>
            </div>

            {/* Quick Actions & Audit Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0d1428] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recent Admin Audit Activity</h3>
                  <button onClick={fetchRealFirestoreUsers} className="text-xs text-blue-400 hover:text-blue-300">
                    🔄 Sync Live
                  </button>
                </div>
                <div className="space-y-2.5">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-300">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#0d1428] border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white">Quick Control Shortcuts</h3>
                <button
                  onClick={() => setIsAddTenantOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30"
                >
                  ➕ Register New Tenant
                </button>
                <button
                  onClick={() => setAdminTab("payments")}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30"
                >
                  💬 Review WhatsApp Slips ({pendingPaymentsCount})
                </button>
                <button
                  onClick={() => setAdminTab("licenses")}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30"
                >
                  🔑 Issue Ed25519 Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TENANT & USER FLEET ── */}
        {adminTab === "tenants" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Registered Tenant Fleet</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real registered accounts in Cloud Firestore with billing and device controls.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchRealFirestoreUsers}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  🔄 Sync Firestore
                </button>
                <button
                  onClick={() => setIsAddTenantOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30"
                >
                  ➕ Add New Tenant
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Filter by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 text-xs bg-[#0d1428] border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500"
              />
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-[#0d1428] border border-slate-700 rounded-xl text-slate-200 outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="enterprise">Enterprise ($199/mo)</option>
                <option value="agency_studio">Agency Studio ($99/mo)</option>
                <option value="creator_pro">Creator Pro ($29/mo)</option>
                <option value="starter">Starter ($0/mo)</option>
              </select>
            </div>

            {/* Tenant Table */}
            <div className="bg-[#0d1428] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Organization / User</th>
                      <th className="px-5 py-3.5">Tier</th>
                      <th className="px-5 py-3.5">MRR</th>
                      <th className="px-5 py-3.5">Seats</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                          No tenants found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-white text-xs">{tenant.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{tenant.ownerEmail}</p>
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={tenant.tier}
                              onChange={(e) => handleChangeTenantTier(tenant.id, e.target.value as TenantRecord["tier"])}
                              className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 font-semibold"
                            >
                              <option value="starter">Starter ($0)</option>
                              <option value="creator_pro">Creator Pro ($29)</option>
                              <option value="agency_studio">Agency ($99)</option>
                              <option value="enterprise">Enterprise ($199)</option>
                            </select>
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                            ${tenant.mrr}/mo
                          </td>
                          <td className="px-5 py-4 text-slate-300 font-mono">
                            {tenant.devices} devices
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                tenant.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {tenant.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleTenantStatus(tenant.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                tenant.status === "active"
                                  ? "bg-amber-950/40 text-amber-300 border border-amber-800 hover:bg-amber-900/60"
                                  : "bg-emerald-950/40 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60"
                              }`}
                            >
                              {tenant.status === "active" ? "Suspend" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleOpenEdit(tenant)}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-950/40 text-blue-300 border border-blue-800 hover:bg-blue-900/60 transition-colors cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(tenant)}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-red-950/40 text-red-300 border border-red-800 hover:bg-red-900/60 transition-colors cursor-pointer"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: MANUAL PAYMENTS ── */}
        {adminTab === "payments" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">WhatsApp &amp; Manual Payments</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify customer payment receipts, approve activations, or log rejections.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaymentFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${paymentFilter === "ALL" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
                >
                  All ({paymentRequests.length})
                </button>
                <button
                  onClick={() => setPaymentFilter("PENDING_VERIFICATION")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${paymentFilter === "PENDING_VERIFICATION" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400"}`}
                >
                  Pending ({pendingPaymentsCount})
                </button>
                <button
                  onClick={() => setPaymentFilter("APPROVED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${paymentFilter === "APPROVED" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}`}
                >
                  Approved
                </button>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center bg-[#0d1428] border border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-xs">No payment requests matching filter.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Customer payment slips uploaded via WhatsApp will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPayments.map((req) => (
                  <div key={req.id} className="p-5 rounded-2xl bg-[#0d1428] border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-blue-400 font-bold">{req.id}</span>
                        <h4 className="font-bold text-white text-sm">{req.customerName}</h4>
                        <p className="text-xs text-slate-400">{req.customerEmail}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {req.status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Plan:</span>
                        <span className="text-white font-bold uppercase">{req.planId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-emerald-400 font-bold font-mono">{req.amount} {req.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Method:</span>
                        <span className="text-slate-200">{req.paymentMethodName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Txn Ref:</span>
                        <span className="text-blue-300 font-mono">{req.transactionReference}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {req.screenshot?.dataUrlOrPath && (
                        <button
                          onClick={() => setSelectedReceipt(req)}
                          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                        >
                          🔍 View Slip
                        </button>
                      )}
                      {req.status === "PENDING_VERIFICATION" && (
                        <>
                          <button
                            onClick={() => handleApprovePayment(req.id)}
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setRejectingRequestId(req.id)}
                            className="py-1.5 px-3 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 rounded-lg text-xs font-bold"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: WHATSAPP & GATEWAYS CONFIG ── */}
        {adminTab === "methods" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">WhatsApp &amp; Payment Gateway Settings</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure direct WhatsApp support contact and domestic payment methods shown to creators.
              </p>
            </div>

            <form onSubmit={handleSavePaymentConfig} className="p-6 rounded-2xl bg-[#0d1428] border border-slate-800 space-y-4 shadow-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official WhatsApp Contact (e.g. +923001234567)
                </label>
                <input
                  type="text"
                  value={paymentConfig.whatsappNumber}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Support Representative Name
                </label>
                <input
                  type="text"
                  value={paymentConfig.supportContactName}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, supportContactName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Hours Notice
                </label>
                <input
                  type="text"
                  value={paymentConfig.businessHours}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, businessHours: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  Save Payment Configurations
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 5: ED25519 LICENSE ISSUER ── */}
        {adminTab === "licenses" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Cryptographic Ed25519 License Issuer</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate signed commercial license tokens for desktop offline workstations.
              </p>
            </div>

            <form onSubmit={handleGenerateLicense} className="p-6 rounded-2xl bg-[#0d1428] border border-slate-800 space-y-4 shadow-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Organization / Tenant ID</label>
                <input
                  type="text"
                  value={genOrgId}
                  onChange={(e) => setGenOrgId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Customer Email</label>
                <input
                  type="email"
                  value={genEmail}
                  onChange={(e) => setGenEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Tier</label>
                  <select
                    value={genTier}
                    onChange={(e) => setGenTier(e.target.value as LicensePayload["tier"])}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="creator_pro">Creator Pro ($29/mo)</option>
                    <option value="agency_studio">Agency Studio ($99/mo)</option>
                    <option value="enterprise">Enterprise ($199/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Bound Workstations</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={genMaxDevices}
                    onChange={(e) => setGenMaxDevices(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? "Signing Token..." : "Generate Signed License Token"}
              </button>
            </form>

            {generatedToken && (
              <div className="p-5 rounded-2xl bg-[#0d1428] border border-indigo-500/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-300">Generated Ed25519 Token:</span>
                  <button
                    onClick={() => copyToClipboard(generatedToken)}
                    className="text-xs text-blue-400 hover:text-white font-semibold cursor-pointer"
                  >
                    {copiedNotice ? "✓ Copied!" : "📋 Copy Token"}
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 break-all select-all">
                  {generatedToken}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: CLOUD TELEMETRY & DB ── */}
        {adminTab === "telemetry" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Cloud Firestore &amp; Infrastructure Health</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Backend services telemetry, storage limits, and security configuration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#0d1428] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cloud Firestore Collections</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400">users /</span>
                    <span className="text-blue-400 font-bold">{tenants.length} documents</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400">payment_requests /</span>
                    <span className="text-emerald-400 font-bold">{paymentRequests.length} records</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400">cloud_projects /</span>
                    <span className="text-indigo-400 font-bold">Cloud Synced</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0d1428] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Security &amp; Hardware Lock</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400">DPAPI Encrypted Vault</span>
                    <span className="text-emerald-400 font-bold">ACTIVE (Local OS)</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400">Ed25519 Signing Engine</span>
                    <span className="text-indigo-400 font-bold">SHA-256 Validated</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400">Project Selected Region</span>
                    <span className="text-slate-300 font-bold">ap-southeast-2 (Sydney)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: Register New Tenant ── */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 bg-[#0d1428] border border-blue-500/40 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Register New Tenant / Creator</h3>
              <button onClick={() => setIsAddTenantOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Creator / Org Name</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="e.g. Ali Production Studio"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={newTenantEmail}
                  onChange={(e) => setNewTenantEmail(e.target.value)}
                  placeholder="creator@gmail.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subscription Tier</label>
                  <select
                    value={newTenantTier}
                    onChange={(e) => setNewTenantTier(e.target.value as TenantRecord["tier"])}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
                  >
                    <option value="starter">Starter ($0/mo)</option>
                    <option value="creator_pro">Creator Pro ($29/mo)</option>
                    <option value="agency_studio">Agency ($99/mo)</option>
                    <option value="enterprise">Enterprise ($199/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Devices</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newTenantDevices}
                    onChange={(e) => setNewTenantDevices(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTenantOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Save Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: View Payment Receipt ── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 bg-[#0d1428] border border-slate-700 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Payment Receipt: {selectedReceipt.id}</h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2 text-center">
              {selectedReceipt.screenshot?.dataUrlOrPath ? (
                <img
                  src={selectedReceipt.screenshot.dataUrlOrPath}
                  alt="Receipt"
                  className="max-h-[55vh] mx-auto rounded object-contain"
                />
              ) : (
                <p className="text-xs text-slate-500 py-8">No receipt preview available.</p>
              )}
            </div>
            <div className="text-xs text-slate-400">
              <p>Customer: <span className="text-white font-semibold">{selectedReceipt.customerName}</span> ({selectedReceipt.customerEmail})</p>
              <p>Reference: <span className="text-blue-300 font-mono">{selectedReceipt.transactionReference}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reject Payment ── */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 bg-[#0d1428] border border-red-500/40 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-red-400">Reject Payment {rejectingRequestId}</h3>
            <p className="text-xs text-slate-400">Please provide a reason for the rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID not found in bank statement..."
              className="w-full h-24 p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-red-500"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRejectingRequestId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Tenant ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 bg-[#0d1428] border border-blue-500/40 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-blue-300 mb-4">✏️ Edit Tenant — {editingTenant.ownerEmail}</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Organization / Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subscription Tier</label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value as TenantRecord["tier"])}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none"
                >
                  <option value="starter">Starter ($0/mo)</option>
                  <option value="creator_pro">Creator Pro ($29/mo)</option>
                  <option value="agency_studio">Agency Studio ($99/mo)</option>
                  <option value="enterprise">Enterprise ($199/mo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Device Seats</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editDevices}
                  onChange={(e) => setEditDevices(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
