import { useState, useEffect } from "react";
import {
  UserLicense,
  TIER_PLANS,
  DEFAULT_FREE_LICENSE,
  validateLicenseKey,
  createActivatedLicense,
  LicenseTier,
} from "../lib/licensingStudio";
import { LicensingRepository } from "../lib/repositories";
import { useAuth } from "../auth/AuthContext";

// Map Firebase plan names → LicenseTier
const PLAN_TO_TIER: Record<string, LicenseTier> = {
  enterprise: "enterprise",
  creator_pro: "creator",
  agency_studio: "pro_studio",
  pro_studio: "pro_studio",
  creator: "creator",
  free: "free",
  starter: "free",
};

interface LicensingStudioPageProps {
  onPlanChanged?: (tier: LicenseTier) => void;
}

export function LicensingStudioPage({ onPlanChanged }: LicensingStudioPageProps) {
  const { profile, isOwner } = useAuth();
  const [currentLicense, setCurrentLicense] = useState<UserLicense>(DEFAULT_FREE_LICENSE);
  const [inputKey, setInputKey] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [holderName, setHolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLicense() {
      try {
        // Priority 1: If owner email, force enterprise
        if (isOwner && isMounted) {
          const ownerLic: UserLicense = {
            ...DEFAULT_FREE_LICENSE,
            tier: "enterprise",
            status: "active",
            holderEmail: profile?.email || "",
            holderName: profile?.displayName || "Umar Hayat",
            licenseKey: "NOVA-ENTERPRISE-OWNER-2026",
            expiresAt: "2027-12-31T23:59:59.000Z",
            maxExportsMonthly: 999,
            maxResolution: "4k",
            watermarkRequired: false,
            canAutoPublish: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: new Date().toISOString(),
          };
          setCurrentLicense(ownerLic);
          if (profile?.email) setHolderEmail(profile.email);
          if (profile?.displayName) setHolderName(profile.displayName);
          if (onPlanChanged) onPlanChanged("enterprise");
          return;
        }

        // Priority 2: Firebase profile plan
        if (profile?.plan && profile.plan !== "free" && isMounted) {
          const firebaseTier = PLAN_TO_TIER[profile.plan] || "free";
          const lic = await LicensingRepository.getCurrentLicense();
          // Only override if Firebase plan is better than stored
          if (lic.tier === "free" || lic.status !== "active") {
            const upgradedLic: UserLicense = {
              ...DEFAULT_FREE_LICENSE,
              tier: firebaseTier,
              status: "active",
              holderEmail: profile.email || lic.holderEmail,
              holderName: profile.displayName || lic.holderName,
              licenseKey: `NOVA-${firebaseTier.toUpperCase()}-CLOUD-${profile.uid?.slice(0, 8).toUpperCase() || "ACTIVE"}`,
              expiresAt: "2027-12-31T23:59:59.000Z",
              maxExportsMonthly: firebaseTier === "enterprise" ? 999 : firebaseTier === "pro_studio" ? 200 : 50,
              maxResolution: firebaseTier === "enterprise" || firebaseTier === "pro_studio" ? "4k" : "1080p",
              watermarkRequired: false,
              canAutoPublish: firebaseTier === "enterprise" || firebaseTier === "pro_studio",
              createdAt: profile.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            if (isMounted) {
              setCurrentLicense(upgradedLic);
              setHolderEmail(upgradedLic.holderEmail);
              setHolderName(upgradedLic.holderName);
              if (onPlanChanged) onPlanChanged(firebaseTier);
            }
            return;
          }
          if (isMounted) {
            setCurrentLicense(lic);
            setHolderEmail(lic.holderEmail);
            setHolderName(lic.holderName);
          }
          return;
        }

        // Priority 3: Local SQLite license
        const lic = await LicensingRepository.getCurrentLicense();
        if (isMounted) {
          setCurrentLicense(lic);
          setHolderEmail(profile?.email || lic.holderEmail);
          setHolderName(profile?.displayName || lic.holderName);
        }
      } catch (err) {
        console.warn("Failed loading license:", err);
      }
    }
    loadLicense();
    return () => {
      isMounted = false;
    };
  }, [profile, isOwner]);

  const handleActivate = async () => {
    if (!inputKey.trim()) {
      setMessage({ type: "error", text: "Please enter a commercial license key." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const validation = validateLicenseKey(inputKey);
      if (!validation.isValid || !validation.tier) {
        throw new Error(validation.error || "Invalid license key format.");
      }

      const newLic = createActivatedLicense(inputKey, holderEmail, holderName);
      await LicensingRepository.saveLicense(newLic);
      setCurrentLicense(newLic);
      setMessage({
        type: "success",
        text: `Successfully activated ${TIER_PLANS[newLic.tier].displayName} license!`,
      });
      setInputKey("");
      if (onPlanChanged) onPlanChanged(newLic.tier);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSwitchTier = async (tier: LicenseTier) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const mockKey = `NOVA-${tier.toUpperCase()}-EVAL-${Date.now().toString(36).toUpperCase()}`;
      const newLic = createActivatedLicense(mockKey, holderEmail, holderName);
      await LicensingRepository.saveLicense(newLic);
      setCurrentLicense(newLic);
      setMessage({
        type: "success",
        text: `Switched active workstation to ${TIER_PLANS[tier].displayName}!`,
      });
      if (onPlanChanged) onPlanChanged(tier);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = TIER_PLANS[currentLicense.tier] || TIER_PLANS.free;
  const usagePercent = Math.min(
    100,
    Math.round((currentLicense.exportsThisMonth / (currentLicense.maxExportsMonthly || 1)) * 100),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0f172a",
        color: "#f8fafc",
        padding: "24px",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>
              Commercial SaaS & Licensing Studio
            </h1>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "#7c3aed",
                color: "#ede9fe",
              }}
            >
              Stage K
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
            Subscription tiers, license key validation, export quota metering, and commercial entitlement gates.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            background: message.type === "success" ? "#064e3b" : "#7f1d1d",
            border: `1px solid ${message.type === "success" ? "#10b981" : "#ef4444"}`,
            color: "#ffffff",
            fontSize: "0.85rem",
            marginBottom: "18px",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Current License Status Card */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: "10px",
          padding: "20px",
          border: "1px solid #334155",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
              ACTIVE WORKSTATION TIER
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: currentPlan.badgeColor }}>
                {currentPlan.displayName}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: currentLicense.status === "active" ? "#166534" : "#991b1b",
                  color: "#dcfce7",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {currentLicense.status}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>License ID / Device</div>
            <div style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "#cbd5e1" }}>
              {currentLicense.licenseKey}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Holder: {currentLicense.holderName} ({currentLicense.holderEmail})
            </div>
          </div>
        </div>

        {/* Quota meters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px solid #293548",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
              <span style={{ color: "#94a3b8" }}>Monthly Video Exports</span>
              <span style={{ fontWeight: 700 }}>
                {currentLicense.exportsThisMonth} / {currentLicense.maxExportsMonthly}
              </span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "#0f172a", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${usagePercent}%`,
                  height: "100%",
                  background: usagePercent > 85 ? "#ef4444" : "#3b82f6",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Resolution Entitlement</div>
            <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: "0.95rem" }}>
              Up to {currentLicense.maxResolution.toUpperCase()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Watermark Status</div>
            <div
              style={{
                fontWeight: 700,
                color: currentLicense.watermarkRequired ? "#f59e0b" : "#22c55e",
                fontSize: "0.95rem",
              }}
            >
              {currentLicense.watermarkRequired ? "Watermark Required" : "Clean Commercial Export (No Watermark)"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Auto-Publish to YouTube</div>
            <div
              style={{
                fontWeight: 700,
                color: currentLicense.canAutoPublish ? "#22c55e" : "#64748b",
                fontSize: "0.95rem",
              }}
            >
              {currentLicense.canAutoPublish ? "Enabled (Direct Upload)" : "Manual Download Only"}
            </div>
          </div>
        </div>
      </div>

      {/* License Key Activation Box */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: "10px",
          padding: "20px",
          border: "1px solid #334155",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem", fontWeight: 700 }}>
          🔑 Activate Commercial License Key
        </h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
              License Key
            </label>
            <input
              type="text"
              placeholder="e.g. NOVA-PRO-STUDIO-8472"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "0.85rem",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
              Holder Name
            </label>
            <input
              type="text"
              placeholder="Your Name / Studio"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "0.85rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
              Holder Email
            </label>
            <input
              type="email"
              placeholder="creator@channel.com"
              value={holderEmail}
              onChange={(e) => setHolderEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "0.85rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={handleActivate}
            disabled={isLoading || !inputKey.trim()}
            style={{
              padding: "10px 22px",
              borderRadius: "6px",
              background: "#3b82f6",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              cursor: isLoading || !inputKey.trim() ? "not-allowed" : "pointer",
              opacity: isLoading || !inputKey.trim() ? 0.6 : 1,
            }}
          >
            {isLoading ? "Validating..." : "Activate License"}
          </button>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700 }}>
        Commercial Subscription Plans
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        {(Object.keys(TIER_PLANS) as LicenseTier[]).map((tierKey) => {
          const plan = TIER_PLANS[tierKey];
          const isCurrent = currentLicense.tier === tierKey;

          return (
            <div
              key={tierKey}
              style={{
                background: "#1e293b",
                borderRadius: "10px",
                padding: "20px",
                border: isCurrent ? `2px solid ${plan.badgeColor}` : "1px solid #334155",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: plan.badgeColor,
                    color: "#ffffff",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Active Plan
                </div>
              )}

              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: plan.badgeColor }}>
                {plan.displayName}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, margin: "8px 0 4px" }}>
                ${plan.monthlyPriceUsd}
                <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 400 }}> / month</span>
              </div>
              <p style={{ margin: "0 0 14px", color: "#94a3b8", fontSize: "0.8rem", minHeight: "36px" }}>
                {plan.description}
              </p>

              <div style={{ flex: 1, borderTop: "1px solid #293548", paddingTop: "12px", marginBottom: "16px" }}>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.8rem", color: "#cbd5e1" }}>
                  {plan.features.map((feat, idx) => (
                    <li key={idx} style={{ marginBottom: "6px" }}>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleQuickSwitchTier(tierKey)}
                disabled={isCurrent || isLoading}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  borderRadius: "6px",
                  background: isCurrent ? "#0f172a" : plan.badgeColor,
                  color: isCurrent ? "#64748b" : "#ffffff",
                  border: isCurrent ? "1px solid #334155" : "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: isCurrent || isLoading ? "default" : "pointer",
                }}
              >
                {isCurrent ? "Active Tier" : `Switch to ${plan.displayName}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
