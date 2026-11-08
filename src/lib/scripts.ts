export type ScriptFormat = "YouTube Shorts" | "Long-form" | "Educational explainer";

export interface ScriptVersion {
  id: string;
  label: string;
  createdAt: string;
  content: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  attempts?: number;
  fallbackReason?: string;
}

export interface ScriptDocument {
  id: string;
  title: string;
  language: string;
  format: ScriptFormat;
  content: string;
  createdAt: string;
  updatedAt: string;
  versions: ScriptVersion[];
  currentVersionId: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  attempts?: number;
  fallbackReason?: string;
}

export function createScriptDocument(input: {
  title: string;
  language: string;
  format: ScriptFormat;
  content: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  attempts?: number;
  fallbackReason?: string;
}): ScriptDocument {
  const timestamp = new Date().toISOString();
  const initialVersion: ScriptVersion = {
    id: `version-${crypto.randomUUID()}`,
    label: input.modelUsed
      ? `Initial draft (${input.modelUsed}${input.fallbackOccurred ? " via fallback" : ""})`
      : "Initial draft",
    createdAt: timestamp,
    content: input.content,
    modelUsed: input.modelUsed,
    fallbackOccurred: input.fallbackOccurred,
    attempts: input.attempts,
    fallbackReason: input.fallbackReason,
  };

  return {
    id: crypto.randomUUID(),
    title: input.title,
    language: input.language,
    format: input.format,
    content: input.content,
    createdAt: timestamp,
    updatedAt: timestamp,
    versions: [initialVersion],
    currentVersionId: initialVersion.id,
    modelUsed: input.modelUsed,
    fallbackOccurred: input.fallbackOccurred,
    attempts: input.attempts,
    fallbackReason: input.fallbackReason,
  };
}

export function createScriptVersion(document: ScriptDocument, nextContent: string): ScriptDocument {
  const timestamp = new Date().toISOString();
  const version: ScriptVersion = {
    id: `version-${crypto.randomUUID()}`,
    label: `Revision ${document.versions.length + 1}`,
    createdAt: timestamp,
    content: nextContent,
  };

  return {
    ...document,
    content: nextContent,
    updatedAt: timestamp,
    currentVersionId: version.id,
    versions: [...document.versions, version],
  };
}

export function restoreScriptVersion(document: ScriptDocument, versionId: string): ScriptDocument {
  const version = document.versions.find((item) => item.id === versionId);
  if (!version) {
    return document;
  }

  return {
    ...document,
    content: version.content,
    updatedAt: new Date().toISOString(),
    currentVersionId: version.id,
  };
}

export function buildScriptContent({
  title,
  topic,
  language,
  format,
}: {
  title: string;
  topic: string;
  language: string;
  format: ScriptFormat;
}): string {
  const safeTitle = title.trim() || "Untitled video";
  const safeTopic = topic.trim();
  const hook =
    language === "Urdu"
      ? `Ø¢Ø¬ ÛÙ… ${safeTopic} Ú©Û’ Ø¨Ø§Ø±Û’ Ù…ÛŒÚº Ø³ÛŒÚ©Ú¾ÛŒÚº Ú¯Û’Û”`
      : language === "Roman Urdu"
        ? `Aaj hum ${safeTopic} ke baray mein seekhien gay.`
        : `Today we are learning about ${safeTopic}.`;

  return [
    `Title: ${safeTitle}`,
    `Format: ${format}`,
    "",
    `Hook: ${hook}`,
    "",
    "Introduction:",
    `This video explains the key idea behind ${safeTopic} in a clear and practical way for ${language} viewers.`,
    "",
    "Main content:",
    "1. Start with the central problem or opportunity.",
    "2. Explain the main concept in simple steps.",
    "3. Add an example or workflow that viewers can apply right away.",
    "4. Connect each idea to a practical takeaway.",
    "",
    "Transition:",
    "Now that the core idea is clear, letâ€™s go into the practical steps and examples.",
    "",
    "Conclusion:",
    "The goal is to make the topic easy to understand and actionable for creators.",
    "",
    "Call to action:",
    "If you liked this breakdown, subscribe for more creator-focused tutorials and practical AI workflows.",
  ].join("\n");
}
