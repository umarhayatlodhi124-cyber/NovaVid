import { PROJECT_LANGUAGES, type ProjectLanguage } from "./project";

export const PROJECT_CATEGORIES = [
  "Technology",
  "Education",
  "Documentary",
  "Business",
  "Lifestyle",
] as const;

export const PROJECT_FORMATS = [
  "YouTube Shorts",
  "Long-form",
  "Educational explainer",
] as const;

export const THEMES = ["dark", "light"] as const;

export type ContentCategory = (typeof PROJECT_CATEGORIES)[number];
export type DefaultFormat = (typeof PROJECT_FORMATS)[number];
export type AppTheme = (typeof THEMES)[number];

export interface StudioSettings {
  defaultLanguage: ProjectLanguage;
  contentCategory: ContentCategory;
  defaultFormat: DefaultFormat;
  theme: AppTheme;
  localOnlyMode: boolean;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  defaultLanguage: "English",
  contentCategory: "Technology",
  defaultFormat: "YouTube Shorts",
  theme: "dark",
  localOnlyMode: true,
};

const SETTINGS_STORAGE_KEY = "ai-youtube-studio.settings";

export function normalizeStudioSettings(input: Partial<StudioSettings>): StudioSettings {
  const defaultLanguage = input.defaultLanguage ?? DEFAULT_SETTINGS.defaultLanguage;
  const contentCategory = input.contentCategory ?? DEFAULT_SETTINGS.contentCategory;
  const defaultFormat = input.defaultFormat ?? DEFAULT_SETTINGS.defaultFormat;
  const theme = input.theme ?? DEFAULT_SETTINGS.theme;
  const localOnlyMode = input.localOnlyMode ?? DEFAULT_SETTINGS.localOnlyMode;

  if (!PROJECT_LANGUAGES.includes(defaultLanguage as ProjectLanguage)) {
    throw new Error("Choose a supported default language.");
  }

  if (!PROJECT_CATEGORIES.includes(contentCategory as ContentCategory)) {
    throw new Error("Choose a supported content category.");
  }

  if (!PROJECT_FORMATS.includes(defaultFormat as DefaultFormat)) {
    throw new Error("Choose a supported default format.");
  }

  if (!THEMES.includes(theme as AppTheme)) {
    throw new Error("Choose a supported theme.");
  }

  return {
    defaultLanguage,
    contentCategory,
    defaultFormat,
    theme,
    localOnlyMode,
  };
}

export function readStoredSettings(storage: Storage | undefined): StudioSettings {
  if (!storage) return DEFAULT_SETTINGS;

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeStudioSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistStoredSettings(storage: Storage | undefined, settings: StudioSettings): void {
  if (!storage) return;
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
