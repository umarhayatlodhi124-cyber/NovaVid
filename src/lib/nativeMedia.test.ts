import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  pickAndImportMediaFiles,
  verifyProjectMediaFiles,
  deleteProjectMediaAsset,
} from "./nativeMedia";
import { MediaRepository } from "./repositories";
import type { MediaAsset } from "./media";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

describe("nativeMedia", () => {
  it("opens native dialog, calls media_import_files and stores asset in repository", async () => {
    vi.mocked(open).mockResolvedValueOnce(["C:\\Videos\\sample.mp4"]);
    vi.mocked(invoke).mockResolvedValueOnce([
      {
        id: "asset-123",
        projectId: "proj-1",
        originalName: "sample.mp4",
        relativePath: "projects/proj-1/media/sample.mp4",
        absolutePath: "C:\\AppData\\projects\\proj-1\\media\\sample.mp4",
        mediaType: "video",
        mimeType: "video/mp4",
        sizeBytes: 15728640,
        width: null,
        height: null,
        durationSeconds: null,
        checksum: "abc123sha256",
        missing: false,
        tags: [],
        importedAt: "2026-11-06T12:00:00Z",
      },
    ]);

    const addSpy = vi.spyOn(MediaRepository, "addMediaAsset").mockResolvedValueOnce();

    const result = await pickAndImportMediaFiles("proj-1");
    expect(open).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("media_import_files", {
      projectId: "proj-1",
      filePaths: ["C:\\Videos\\sample.mp4"],
    });
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "asset-123",
        name: "sample.mp4",
        checksum: "abc123sha256",
        size: "15 MB",
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].checksum).toBe("abc123sha256");
  });

  it("handles cancelled dialog gracefully", async () => {
    vi.mocked(open).mockResolvedValueOnce(null);
    const result = await pickAndImportMediaFiles("proj-1");
    expect(result).toEqual([]);
  });

  it("verifies project media files and flags missing assets", async () => {
    const existing: MediaAsset[] = [
      {
        id: "m-1",
        name: "test.png",
        type: "image",
        size: "1 MB",
        importedAt: "2026-11-06T12:00:00Z",
        projectId: "proj-1",
        relativePath: "projects/proj-1/media/test.png",
        missing: false,
      },
    ];

    vi.spyOn(MediaRepository, "listMediaAssets").mockResolvedValueOnce(existing);
    vi.mocked(invoke).mockResolvedValueOnce(["projects/proj-1/media/test.png"]); // reported missing by backend
    const updateSpy = vi.spyOn(MediaRepository, "updateMediaAssetMissing").mockResolvedValueOnce();

    const verified = await verifyProjectMediaFiles("proj-1");
    expect(updateSpy).toHaveBeenCalledWith("m-1", true);
    expect(verified[0].missing).toBe(true);
  });

  it("deletes asset from repository and invokes native file deletion", async () => {
    const deleteRepoSpy = vi.spyOn(MediaRepository, "deleteMediaAsset").mockResolvedValueOnce();
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    const asset: MediaAsset = {
      id: "m-1",
      name: "test.png",
      type: "image",
      size: "1 MB",
      importedAt: "2026-11-06T12:00:00Z",
      projectId: "proj-1",
      relativePath: "projects/proj-1/media/test.png",
    };

    await deleteProjectMediaAsset(asset);
    expect(deleteRepoSpy).toHaveBeenCalledWith("m-1");
    expect(invoke).toHaveBeenCalledWith("media_delete_asset_file", {
      relativePath: "projects/proj-1/media/test.png",
    });
  });
});

