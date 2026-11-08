import { describe, expect, it } from "vitest";
import { normalizeProjectInput } from "./project";

describe("normalizeProjectInput", () => {
  it("trims project fields before saving", () => {
    expect(
      normalizeProjectInput({
        name: "  AI for creators  ",
        topic: "  Useful tools for video makers ",
        language: " English ",
      }),
    ).toEqual({
      name: "AI for creators",
      topic: "Useful tools for video makers",
      language: "English",
    });
  });

  it("accepts the supported studio languages only", () => {
    expect(
      normalizeProjectInput({
        name: "Project",
        topic: "Video topic",
        language: "Roman Urdu",
      }),
    ).toEqual({
      name: "Project",
      topic: "Video topic",
      language: "Roman Urdu",
    });

    expect(() =>
      normalizeProjectInput({
        name: "Project",
        topic: "Video topic",
        language: "French",
      }),
    ).toThrow("Choose a supported language.");
  });

  it("rejects a missing project name", () => {
    expect(() =>
      normalizeProjectInput({ name: " ", topic: "Video topic", language: "English" }),
    ).toThrow("Enter a project name.");
  });

  it("rejects a missing topic", () => {
    expect(() =>
      normalizeProjectInput({ name: "Project", topic: " ", language: "English" }),
    ).toThrow("Enter a video topic.");
  });

  it("enforces the project field limits", () => {
    expect(() =>
      normalizeProjectInput({
        name: "x".repeat(101),
        topic: "Video topic",
        language: "English",
      }),
    ).toThrow("Project names must be 100 characters or fewer.");
    expect(() =>
      normalizeProjectInput({
        name: "Project",
        topic: "x".repeat(501),
        language: "English",
      }),
    ).toThrow("Video topics must be 500 characters or fewer.");
  });
});
