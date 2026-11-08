import { describe, it, expect } from "vitest";
import {
  sanitizePath,
  isPathContained,
  maskSecretKey,
  createProjectBackupSnapshot,
  verifyBackupIntegrity,
} from "./securityReliability";

describe("Stage L — Security, Privacy & Reliability Studio Unit Tests", () => {
  it("sanitizePath neutralizes path traversal, backslashes, and null byte injections", () => {
    expect(sanitizePath("../../windows/system32/cmd.exe")).toBe("windows/system32/cmd.exe");
    expect(sanitizePath("..\\..\\config\\secret.key")).toBe("config/secret.key");
    expect(sanitizePath("assets/broll/../../../sensitive.db")).toBe("assets/broll/sensitive.db");
    expect(sanitizePath("malicious\0file.mp4")).toBe("maliciousfile.mp4");
    expect(sanitizePath("/root/subfolder/video.mp4")).toBe("root/subfolder/video.mp4");
  });

  it("isPathContained disallows traversal and external drive roots", () => {
    expect(isPathContained("G:/Nova Vid", "C:/Windows/System32")).toBe(false);
    expect(isPathContained("G:/Nova Vid", "\\\\network-share\\leak")).toBe(false);
    expect(isPathContained("G:/Nova Vid", "../escaped/folder")).toBe(false);
    expect(isPathContained("G:/Nova Vid", "projects/proj_1/media/broll.mp4")).toBe(true);
    expect(isPathContained("G:/Nova Vid", "exports/render_1080p.mp4")).toBe(true);
  });

  it("maskSecretKey masks secrets without leaking full string into logs or UI", () => {
    expect(maskSecretKey("")).toBe("");
    expect(maskSecretKey("short")).toBe("********");
    const masked = maskSecretKey("AIzaSyD84920492817420194");
    expect(masked.startsWith("AIza")).toBe(true);
    expect(masked.endsWith("0194")).toBe(true);
    expect(masked).toContain("****");
    expect(masked).not.toBe("AIzaSyD84920492817420194");
  });

  it("createProjectBackupSnapshot and verifyBackupIntegrity protect against data corruption", () => {
    const payload = { title: "Quantum Physics Doc", scenesCount: 12, readyForRender: true };
    const snapshot = createProjectBackupSnapshot("proj_backup_1", "Quantum Doc", payload);

    expect(snapshot.projectId).toBe("proj_backup_1");
    expect(snapshot.checksum).toBeDefined();
    expect(verifyBackupIntegrity(snapshot)).toBe(true);

    // Tampered payload detection
    const tamperedSnapshot = { ...snapshot, payloadJson: snapshot.payloadJson + " " };
    expect(verifyBackupIntegrity(tamperedSnapshot)).toBe(false);
  });
});
