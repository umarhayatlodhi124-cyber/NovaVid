import { invoke } from "@tauri-apps/api/core";

export interface SystemResourceMetrics {
  totalPhysicalRamMb: number;
  availablePhysicalRamMb: number;
  memoryLoadPercent: number;
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
      return saved;
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
  if (metrics.totalPhysicalRamMb <= 8500 || metrics.availablePhysicalRamMb < 1500 || metrics.memoryLoadPercent >= 80) {
    return "low_resource";
  }
  if (metrics.totalPhysicalRamMb <= 16500) {
    return "balanced";
  }
  return "performance";
}

export async function fetchSystemResourceMetrics(): Promise<SystemResourceMetrics> {
  try {
    return await invoke<SystemResourceMetrics>("system_get_resource_metrics");
  } catch {
    // Browser or test environment fallback
    return {
      totalPhysicalRamMb: 8192,
      availablePhysicalRamMb: 2048,
      memoryLoadPercent: 75,
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
