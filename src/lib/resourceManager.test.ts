import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredResourceMode,
  setStoredResourceMode,
  recommendResourceMode,
  type SystemResourceMetrics,
} from "./resourceManager";

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  };
}

describe("Resource Manager & 8GB RAM Protection", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("defaults to low_resource mode for safe operation on 8GB machines", () => {
    expect(getStoredResourceMode(storage)).toBe("low_resource");
  });

  it("persists and reads user selected resource mode", () => {
    setStoredResourceMode("balanced", storage);
    expect(getStoredResourceMode(storage)).toBe("balanced");

    setStoredResourceMode("performance", storage);
    expect(getStoredResourceMode(storage)).toBe("performance");
  });

  it("recommends low_resource mode when physical RAM is 8GB or less", () => {
    const metrics: SystemResourceMetrics = {
      totalPhysicalRamMb: 7987,
      availablePhysicalRamMb: 1420,
      memoryLoadPercent: 82,
      cpuCoreCount: 4,
      lowResourceRecommended: true,
      systemStatus: "Operating at 82% memory load.",
    };

    expect(recommendResourceMode(metrics)).toBe("low_resource");
  });

  it("recommends low_resource mode when memory load is 80% or higher regardless of RAM", () => {
    const metrics: SystemResourceMetrics = {
      totalPhysicalRamMb: 16384,
      availablePhysicalRamMb: 1200,
      memoryLoadPercent: 88,
      cpuCoreCount: 8,
      lowResourceRecommended: true,
      systemStatus: "High load.",
    };

    expect(recommendResourceMode(metrics)).toBe("low_resource");
  });

  it("recommends balanced mode for 16GB machines with healthy headroom", () => {
    const metrics: SystemResourceMetrics = {
      totalPhysicalRamMb: 16384,
      availablePhysicalRamMb: 8192,
      memoryLoadPercent: 50,
      cpuCoreCount: 8,
      lowResourceRecommended: false,
      systemStatus: "Healthy",
    };

    expect(recommendResourceMode(metrics)).toBe("balanced");
  });
});
