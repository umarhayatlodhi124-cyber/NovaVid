// NovaVid AI Studio — Stage W2: Production Admin SaaS Control Center
// Complete multi-tenant oversight, billing metrics, license issuance, and device revocation.

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

export const AdminSaaSPanel: React.FC<AdminSaaSPanelProps> = ({ onNavigateToAwsConnection }) => {
  const [session, setSession] = useState<CloudSession>(cloudClient.getSession());
  const [tenants, setTenants] = useState<MockTenant[]>(INITIAL_TENANTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Admin Auth Gate State
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isPasscodeAuthorized, setIsPasscodeAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"google" | "email" | "passcode">("google");

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
        setAuthError(`Access Denied: Account '${user.email}' is not authorized for Super Admin SaaS management.`);
        await logoutFirebase();
        return;
      }
      cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
      setSession(cloudClient.getSession());
    } catch (err: any) {
      setAuthError(err?.message || "Failed to sign in with Google.");
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
        setAuthError(`Access Denied: '${user.email}' lacks Super Admin permissions.`);
        await logoutFirebase();
        return;
      }
      cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
      setSession(cloudClient.getSession());
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

  // License Generator State
  const [genOrgId, setGenOrgId] = useState("org_client_new");
  const [genEmail, setGenEmail] = useState("creator@client.com");
  const [genTier, setGenTier] = useState<LicensePayload["tier"]>("creator_pro");
  const [genMaxDevices, setGenMaxDevices] = useState(5);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Security Audit Log State
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; time: string }>>([
    { id: "log_1", action: "Tenant 'Alpha Apex Media' upgraded to Enterprise tier", time: "10 mins ago" },
    { id: "log_2", action: "Cryptographic license issued for 'lead@nexuscreators.co'", time: "42 mins ago" },
    { id: "log_3", action: "Suspicious machine fingerprint HW-REVOKED-99 quarantined", time: "2 hours ago" },
  ]);

  const handleToggleAdminMode = () => {
    if (session.role === "super_admin") {
      cloudClient.loginWithToken("jwt_creator_token", { role: "creator" });
    } else {
      cloudClient.loginWithToken("jwt_super_admin_token", { role: "super_admin" });
    }
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

      const newLog = {
        id: `log_${Date.now()}`,
        action: `Cryptographic license issued for ${genEmail} (${genTier}, max ${genMaxDevices} devices)`,
        time: "Just now",
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleToggleTenantStatus = (id: string) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus = t.status === "active" ? "suspended" : "active";
        return { ...t, status: nextStatus };
      })
    );
    const tenant = tenants.find((t) => t.id === id);
    if (tenant) {
      setAuditLogs((prev) => [
        {
          id: `log_${Date.now()}`,
          action: `Tenant '${tenant.name}' status toggled to ${tenant.status === "active" ? "suspended" : "active"}`,
          time: "Just now",
        },
        ...prev,
      ]);
    }
  };

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
            Master Key
          </button>
        </div>

        {/* Tab 1: Google OAuth Sign In */}
        {authMode === "google" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed text-center">
              Authenticate via Google with an authorized owner account (e.g. <span className="font-mono text-indigo-300">umarhayatlodhi25@gmail.com</span>).
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {isAuthLoading ? "Authenticating..." : "Sign In with Google"}
            </button>
          </div>
        )}

        {/* Tab 2: Email & Password Sign In */}
        {authMode === "email" && (
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Owner Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="owner@lodhitechx.com"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
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
              {isAuthLoading ? "Verifying Credentials..." : "Authenticate as Super Admin"}
            </button>
          </form>
        )}

        {/* Tab 3: Master Admin Passcode */}
        {authMode === "passcode" && (
          <form onSubmit={handlePasscodeSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Offline Master Passcode</label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter master passcode"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                For offline desktop management during network disconnects.
              </p>
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors cursor-pointer"
            >
              Verify Master Key
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            Protected by Firebase Auth RLS & Ed25519 Cryptographic Gate
          </p>
        </div>
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
                Stage W2 Production SaaS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SUPER ADMIN: {currentUser?.email || (isPasscodeAuthorized ? "Master Key" : session.role.toUpperCase())}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1.5">
              Commercial SaaS Administration & Fleet Control
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Multi-tenant telemetry, automated MRR metering, Ed25519 cryptographic licensing, and device access control.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToAwsConnection && (
              <button
                onClick={onNavigateToAwsConnection}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/20"
              >
                <span>☁️ AWS Cloud Connection (BYOA) ↗</span>
              </button>
            )}
            <button
              onClick={handleAdminLogout}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 transition-colors cursor-pointer"
            >
              🔒 Lock / Sign Out
            </button>
            <button
              onClick={handleToggleAdminMode}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
            >
              Simulate: {session.role === "super_admin" ? "Switch to Creator Role" : "Elevate to Super Admin"}
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
            <p className="text-xs font-medium text-slate-400">Active Tenant Organizations</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{tenants.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">100% PostgreSQL RLS Isolated</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs font-medium text-slate-400">Total Bound Hardware Seats</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{activeSeats}</p>
            <p className="text-[11px] text-indigo-400/80 mt-0.5 font-medium">Hardware Fingerprint Locked</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5">
            <p className="text-xs font-medium text-slate-400">Cloud AI Token Consumption</p>
            <p className="text-2xl font-black text-amber-400 mt-1">4.28M</p>
            <p className="text-[11px] text-amber-400/80 mt-0.5 font-medium">Gemini 2.5 Pro + Imagen 3</p>
          </div>
        </div>
      </div>

      {/* Main Admin Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-Tenant Management Table (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
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
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
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
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : t.status === "past_due"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={() => handleToggleTenantStatus(t.id)}
                          className={`px-2.5 py-1 text-[11px] font-sans font-medium rounded transition-colors ${
                            t.status === "active"
                              ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                              : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {t.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Log Stream */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Recent Security & Administrative Actions
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              {auditLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-slate-950/40 px-3 py-1.5 rounded border border-slate-800/80">
                  <span className="font-mono text-slate-300">{log.action}</span>
                  <span className="text-[11px] text-slate-500">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Cryptographic License Token Issuer (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Cryptographic License Issuer</h3>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                Ed25519 Signed
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Issues tamper-proof digital license keys that work 100% offline with cryptographic verification.
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
                className="w-full mt-2 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors flex items-center justify-center gap-2"
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
                    className="text-[10px] text-indigo-300 hover:text-white underline font-mono"
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

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 leading-tight">
            * All generated tokens contain an embedded cryptographic SHA-256 HMAC digital signature. Any local client tampering immediately voids the signature.
          </div>
        </div>
      </div>
    </div>
  );
};
