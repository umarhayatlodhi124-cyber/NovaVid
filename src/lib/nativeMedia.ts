import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { MediaAsset } from "./media";
import { MediaRepository } from "./repositories";

export interface NativeImportedAsset {
  id: string;
  projectId: string;
  originalName: string;
  relativePath: string;
  absolutePath: string;
  mediaType: "image" | "video" | "audio" | "document";
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  checksum: string;
  missing: boolean;
  tags: string[];
  importedAt: string;
}

export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Opens the native Windows file picker, copies files to the project media directory,
 * extracts metadata & checksum, and stores the records in SQLite.
 */
export async function pickAndImportMediaFiles(projectId: string): Promise<MediaAsset[]> {
  if (!projectId) {
    throw new Error("Select a project before importing media assets.");
  }

  // 1. Pick files using native dialog
  const selected = await open({
    multiple: true,
    title: "Select Media Assets for Project",
    filters: [
      {
        name: "All Supported Media",
        extensions: ["png", "jpg", "jpeg", "webp", "mp4", "webm", "mp3", "wav", "pdf", "txt"],
      },
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp"],
      },
      {
        name: "Video & Audio",
        extensions: ["mp4", "webm", "mp3", "wav"],
      },
    ],
  });

  if (!selected) return [];

  const filePaths = Array.isArray(selected) ? selected : [selected];
  if (filePaths.length === 0) return [];

  // 2. Perform native copy and metadata extraction via Rust backend
  const nativeAssets = await invoke<NativeImportedAsset[]>("media_import_files", {
    projectId,
    filePaths,
  });

  // 3. Save to SQLite repository
  const savedAssets: MediaAsset[] = [];
  for (const item of nativeAssets) {
    const asset: MediaAsset = {
      id: item.id,
      name: item.originalName,
      type: item.mediaType,
      size: formatBytes(item.sizeBytes),
      importedAt: item.importedAt,
      projectId: item.projectId,
      relativePath: item.relativePath,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      width: item.width,
      height: item.height,
      durationSeconds: item.durationSeconds,
      checksum: item.checksum,
      missing: item.missing,
    };
    await MediaRepository.addMediaAsset(asset);
    savedAssets.push(asset);
  }

  return savedAssets;
}

/**
 * Verifies on-disk presence of media files for a project and updates missing flags in SQLite.
 */
export async function verifyProjectMediaFiles(projectId: string): Promise<MediaAsset[]> {
  const currentAssets = await MediaRepository.listMediaAssets(projectId);
  if (currentAssets.length === 0) return [];

  const relativePaths = currentAssets
    .map((a) => a.relativePath)
    .filter((p): p is string => Boolean(p));

  if (relativePaths.length === 0) return currentAssets;

  try {
    const missingPaths = await invoke<string[]>("media_verify_assets", {
      relativePaths,
    });

    const missingSet = new Set(missingPaths);
    const updated: MediaAsset[] = [];

    for (const asset of currentAssets) {
      const isMissing = asset.relativePath ? missingSet.has(asset.relativePath) : false;
      if (asset.missing !== isMissing) {
        await MediaRepository.updateMediaAssetMissing(asset.id, isMissing);
        updated.push({ ...asset, missing: isMissing });
      } else {
        updated.push(asset);
      }
    }

    return updated;
  } catch {
    // If native command fails or in web mode, return current
    return currentAssets;
  }
}

/**
 * Removes an asset from SQLite and deletes its copied file from disk.
 */
export async function deleteProjectMediaAsset(asset: MediaAsset): Promise<void> {
  await MediaRepository.deleteMediaAsset(asset.id);
  if (asset.relativePath) {
    try {
      await invoke("media_delete_asset_file", { relativePath: asset.relativePath });
    } catch {
      // Ignore disk delete errors if already removed
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

