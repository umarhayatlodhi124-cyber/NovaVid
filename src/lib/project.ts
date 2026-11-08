export type ProjectStatus = "draft" | "in_progress" | "completed";

export const PROJECT_LANGUAGES = [
  "English",
  "Roman Urdu",
  "Urdu",
  "Hindi",
] as const;

export type ProjectLanguage = (typeof PROJECT_LANGUAGES)[number];

export interface Project {
  id: string;
  name: string;
  topic: string;
  language: ProjectLanguage;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  topic: string;
  language: string;
}

export interface ProjectArchive {
  version: "2.0";
  exportedAt: string;
  project: Project;
  research?: unknown;
  script?: unknown;
  storyboard?: unknown;
  subtitles?: unknown;
  timeline?: unknown;
  seo?: unknown;
}

export function isSupportedProjectLanguage(value: string): value is ProjectLanguage {
  return PROJECT_LANGUAGES.includes(value as ProjectLanguage);
}

export function normalizeProjectInput(input: ProjectInput): ProjectInput {
  const name = input.name.trim();
  const topic = input.topic.trim();
  const language = input.language.trim();

  if (!name) throw new Error("Enter a project name.");
  if (!topic) throw new Error("Enter a video topic.");
  if (name.length > 100) throw new Error("Project names must be 100 characters or fewer.");
  if (topic.length > 500) throw new Error("Video topics must be 500 characters or fewer.");
  if (!language) throw new Error("Choose a primary language.");
  if (!isSupportedProjectLanguage(language)) throw new Error("Choose a supported language.");

  return { name, topic, language };
}
