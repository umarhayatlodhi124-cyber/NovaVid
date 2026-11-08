import { describe, it, expect } from "vitest";
import {
  getOwnerAvatarProfile,
  listTenantAvatars,
  saveTenantAvatar,
  generateTaleemiDuniyaScript,
  TALEEMI_DUNIYA_MODES,
  type AvatarProfile,
} from "./avatarStudio";

describe("Personal AI Face Presenter & Avatar Studio", () => {
  it("1. Provides Taleemi Duniya Pro owner avatar with commercial rights", () => {
    const ownerAvatar = getOwnerAvatarProfile("owner_lodhi_techx");
    expect(ownerAvatar.name).toContain("Umar Hayat");
    expect(ownerAvatar.title).toContain("Taleemi Duniya Pro");
    expect(ownerAvatar.isOwnerAvatar).toBe(true);
    expect(ownerAvatar.commercialUsageApproved).toBe(true);
    expect(ownerAvatar.voiceName).toBe("ur-PK-AsadNeural");
    expect(ownerAvatar.status).toBe("ready");
  });

  it("2. Enforces tenant isolation for face and avatar profiles", () => {
    const tenantAId = "tenant-instructor-ahmed";
    const tenantBId = "tenant-creator-sara";

    const avatarA: AvatarProfile = {
      id: "avatar_ahmed_01",
      userId: tenantAId,
      name: "Professor Ahmed",
      title: "Physics Faculty",
      photoUrl: "/avatars/ahmed.png",
      voiceName: "ur-PK-AsadNeural",
      provider: "heygen",
      layout: "split_screen",
      isOwnerAvatar: false,
      productContext: "Custom",
      status: "ready",
      commercialUsageApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTenantAvatar(avatarA);

    const avatarB: AvatarProfile = {
      id: "avatar_sara_02",
      userId: tenantBId,
      name: "Sara Tech Reviews",
      title: "Gadget Host",
      photoUrl: "/avatars/sara.png",
      voiceName: "en-US-JennyNeural",
      provider: "d-id",
      layout: "full_screen",
      isOwnerAvatar: false,
      productContext: "Custom",
      status: "ready",
      commercialUsageApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTenantAvatar(avatarB);

    const listA = listTenantAvatars(tenantAId);
    expect(listA.length).toBe(1);
    expect(listA[0].name).toBe("Professor Ahmed");

    const listB = listTenantAvatars(tenantBId);
    expect(listB.length).toBe(1);
    expect(listB[0].name).toBe("Sara Tech Reviews");

    // Zero cross-tenant leakage
    expect(listA.some((a) => a.id === "avatar_sara_02")).toBe(false);
    expect(listB.some((a) => a.id === "avatar_ahmed_01")).toBe(false);
  });

  it("3. Supports Taleemi Duniya Pro video modes and script generation", () => {
    expect(TALEEMI_DUNIYA_MODES.length).toBe(5);

    // Promotional Mode
    const promo = generateTaleemiDuniyaScript("promotional");
    expect(promo.title).toContain("Taleemi Duniya Pro");
    expect(promo.scriptUrdu).toContain("تعلیمی دنیا پرو");
    expect(promo.scriptEnglish).toContain("Taleemi Duniya Pro");

    // Software Tutorial Mode
    const tutorial = generateTaleemiDuniyaScript("software_tutorial", "Smart Online Tests");
    expect(tutorial.title).toContain("Tutorial");
    expect(tutorial.scriptUrdu).toContain("ڈیش بورڈ");
    expect(tutorial.scenesCount).toBeGreaterThanOrEqual(4);
  });
});
