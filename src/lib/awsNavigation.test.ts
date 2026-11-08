import { describe, it, expect } from "vitest";
import { navigation, getFilteredNavigation, UserMode } from "../App";

describe("NovaVid AI Studio — AWS Connection Center Navigation Fix", () => {
  it("should have AWS Cloud Connection registered in primary navigation", () => {
    const awsEntry = navigation.find((item) => item.view === "aws_cloud");
    expect(awsEntry).toBeDefined();
    expect(awsEntry?.label).toBe("AWS Cloud Connection");
    expect(awsEntry?.icon).toBe("render");
  });

  it("should ensure AWS Cloud Connection is visible in beginner mode (default UI mode)", () => {
    const beginnerNav = getFilteredNavigation("beginner");
    const awsEntry = beginnerNav.find((item) => item.view === "aws_cloud");
    expect(awsEntry).toBeDefined();
    expect(awsEntry?.label).toBe("AWS Cloud Connection");
  });

  it("should ensure AWS Cloud Connection is visible in creator mode", () => {
    const creatorNav = getFilteredNavigation("creator");
    const awsEntry = creatorNav.find((item) => item.view === "aws_cloud");
    expect(awsEntry).toBeDefined();
    expect(awsEntry?.label).toBe("AWS Cloud Connection");
  });

  it("should ensure AWS Cloud Connection is visible in advanced mode", () => {
    const advancedNav = getFilteredNavigation("advanced");
    const awsEntry = advancedNav.find((item) => item.view === "aws_cloud");
    expect(awsEntry).toBeDefined();
    expect(awsEntry?.label).toBe("AWS Cloud Connection");
  });

  it("should confirm AWS Cloud Connection is universally accessible across all user modes", () => {
    const modes: UserMode[] = ["beginner", "creator", "advanced"];
    modes.forEach((mode) => {
      const navList = getFilteredNavigation(mode);
      const views = navList.map((item) => item.view);
      expect(views).toContain("aws_cloud");
    });
  });
});
