import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  normalizeStudioSettings,
} from "./settings";

describe("normalizeStudioSettings", () => {
  it("applies safe defaults and keeps supported values", () => {
    expect(normalizeStudioSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(
      normalizeStudioSettings({
        defaultLanguage: "Roman Urdu",
        contentCategory: "Education",
        defaultFormat: "Long-form",
        theme: "light",
        localOnlyMode: false,
      }),
    ).toEqual({
      defaultLanguage: "Roman Urdu",
      contentCategory: "Education",
      defaultFormat: "Long-form",
      theme: "light",
      localOnlyMode: false,
    });
  });

  it("rejects unsupported defaults", () => {
    expect(() =>
      normalizeStudioSettings({
        defaultLanguage: "French" as never,
      }),
    ).toThrow("Choose a supported default language.");

    expect(() =>
      normalizeStudioSettings({
        theme: "solarized" as never,
      }),
    ).toThrow("Choose a supported theme.");
  });
});
