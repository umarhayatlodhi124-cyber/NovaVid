import { invoke } from "@tauri-apps/api/core";

export interface SystemResourceMetrics {
  totalRamMb: number;
  availableRamMb: number;
  usedRamMb: number;
  totalPhysicalRamMb: number;
  availablePhysicalRamMb: number;
  memoryLoadPercent: number;
  isLowRamDevice: boolean;
  isMemoryCritical: boolean;
  recommendedMode: ResourceMode;
  cpuCoreCount: number;
  lowResourceRecommended: boolean;
  systemStatus: string;
}

export type ResourceMode = "low_resource" | "balanced" | "performance";

const RESOURCE_MODE_STORAGE_KEY = "novavid_resource_mode_v2";

export function getStoredResourceMode(storage?: Storage): ResourceMode {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return "low_resource";

  try {
    const saved = store.getItem(RESOURCE_MODE_STORAGE_KEY);
    if (saved === "low_resource" || saved === "balanced" || saved === "performance") {
      return saved as ResourceMode;
    }
  } catch {
    // ignore
  }
  return "low_resource"; // Safe default for 8GB RAM workstations
}

export function setStoredResourceMode(mode: ResourceMode, storage?: Storage): void {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return;

  try {
    store.setItem(RESOURCE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function recommendResourceMode(metrics: SystemResourceMetrics): ResourceMode {
  // If machine has <= 8GB RAM or available RAM is below 1.5GB, strictly enforce low_resource
  const total = metrics.totalRamMb || metrics.totalPhysicalRamMb || 8192;
  const avail = metrics.availableRamMb || metrics.availablePhysicalRamMb || 2048;
  if (total <= 8500 || avail < 1500 || metrics.memoryLoadPercent >= 80) {
    return "low_resource";
  }
  if (total <= 16500) {
    return "balanced";
  }
  return "performance";
}

export async function fetchSystemResourceMetrics(): Promise<SystemResourceMetrics> {
  try {
    const raw: any = await invoke("system_get_resource_metrics");
    const total = Number(raw.totalRamMb ?? raw.totalPhysicalRamMb ?? 8192);
    const avail = Number(raw.availableRamMb ?? raw.availablePhysicalRamMb ?? 2048);
    const used = Number(raw.usedRamMb ?? Math.max(0, total - avail));
    const load = Number(raw.memoryLoadPercent ?? Math.round((used / Math.max(1, total)) * 100));
    const isLow = total <= 8500;
    const isCritical = avail < 1000;
    const recMode = (raw.recommendedMode as ResourceMode) || (isLow ? "low_resource" : "balanced");

    return {
      totalRamMb: total,
      availableRamMb: avail,
      usedRamMb: used,
      totalPhysicalRamMb: total,
      availablePhysicalRamMb: avail,
      memoryLoadPercent: load,
      isLowRamDevice: isLow,
      isMemoryCritical: isCritical,
      recommendedMode: recMode,
      cpuCoreCount: Number(raw.cpuCoreCount ?? 8),
      lowResourceRecommended: isLow,
      systemStatus: `Hardware RAM Monitor: ${total} MB Total, ${avail} MB Free`,
    };
  } catch {
    // Browser or test environment fallback
    return {
      totalRamMb: 8192,
      availableRamMb: 2048,
      usedRamMb: 6144,
      totalPhysicalRamMb: 8192,
      availablePhysicalRamMb: 2048,
      memoryLoadPercent: 75,
      isLowRamDevice: true,
      isMemoryCritical: false,
      recommendedMode: "low_resource",
      cpuCoreCount: 4,
      lowResourceRecommended: true,
      systemStatus: "Simulated resource monitor (safe mode)",
    };
  }
}

export function startResourceMonitoring(
  callback: (metrics: SystemResourceMetrics, mode: ResourceMode) => void,
  intervalMs = 8000,
): () => void {
  let active = true;

  const check = async () => {
    if (!active) return;
    try {
      const metrics = await fetchSystemResourceMetrics();
      const currentMode = getStoredResourceMode();
      if (active) {
        callback(metrics, currentMode);
      }
    } catch {
      // ignore
    }
  };

  void check();
  const timer = setInterval(() => {
    void check();
  }, intervalMs);

  return () => {
    active = false;
    clearInterval(timer);
  };
}
