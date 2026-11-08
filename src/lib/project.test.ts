import { describe, expect, it } from "vitest";
import { normalizeProjectInput } from "./project";
import {
  createProject,
  getProject,
  duplicateProject,
  exportProjectArchive,
  importProjectArchive,
} from "./projects";

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

describe("Project Duplication & Portable Archiving", () => {
  it("creates, retrieves, duplicates and exports project archives", async () => {
    const created = await createProject({
      name: "Lodhi TechX Original",
      topic: "Autonomous AI Video Studio Engine",
      language: "Urdu",
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe("Lodhi TechX Original");

    const fetched = await getProject(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("Lodhi TechX Original");

    const duplicated = await duplicateProject(created.id, "Lodhi TechX Clone");
    expect(duplicated.id).not.toBe(created.id);
    expect(duplicated.name).toBe("Lodhi TechX Clone");
    expect(duplicated.topic).toBe(created.topic);

    const archive = await exportProjectArchive(created.id);
    expect(archive.version).toBe("2.0");
    expect(archive.project.name).toBe("Lodhi TechX Original");

    const imported = await importProjectArchive(archive);
    expect(imported.id).not.toBe(created.id);
    expect(imported.name).toContain("Imported");
  });
});
