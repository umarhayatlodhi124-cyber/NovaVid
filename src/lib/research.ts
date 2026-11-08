import { GeminiProviderAdapter } from "./providers";

export interface ResearchBrief {
  id: string;
  topic: string;
  language: string;
  questions: string[];
  outline: string[];
  keyPoints: string[];
  structure: string[];
  verifiedFacts: string[];
  assumptions: string[];
  limitations: string;
  createdAt: string;
  providerName: string;
}

export interface ResearchRequest {
  topic: string;
  language: string;
  provider: GeminiProviderAdapter;
}

export function generateResearchBrief({ topic, language, provider }: ResearchRequest): ResearchBrief {
  const normalizedTopic = topic.trim();
  if (!normalizedTopic) {
    throw new Error("Enter a video topic before researching it.");
  }

  const baseQuestions = [
    `What problem is the audience trying to solve with ${normalizedTopic}?`,
    `What is the clearest angle for a useful ${language} video on ${normalizedTopic}?`,
    `What examples or demonstrations would help viewers trust and act on the content?`,
  ];

  const baseOutline = [
    "Open with a strong hook and audience pain point.",
    "Explain the core concept in simple language.",
    "Break the topic into digestible steps or examples.",
    "Add practical takeaways or a demo.",
    "Close with a clear next action or CTA.",
  ];

  const baseKeyPoints = [
    `Define the topic clearly for ${language} viewers.`,
    "Keep explanations practical, useful, and easy to follow.",
    "Use examples or workflow steps instead of vague claims.",
  ];

  const structure = [
    "Hook and audience setup",
    "Problem and opportunity",
    "Core concept explanation",
    "Examples and action steps",
    "Closing CTA and recap",
  ];

  return {
    id: crypto.randomUUID(),
    topic: normalizedTopic,
    language,
    questions: baseQuestions,
    outline: baseOutline,
    keyPoints: baseKeyPoints,
    structure,
    verifiedFacts: [
      "The brief is generated locally and must be reviewed before publication.",
      "The application will not invent live trend statistics, citations, or rankings without a verified source.",
    ],
    assumptions: [
      `The content should be useful to viewers interested in ${normalizedTopic}.`,
      "A practical, beginner-friendly structure is the safest production approach.",
    ],
    limitations:
      "Web research is unavailable in this local build. This brief is an AI-generated production outline and should be reviewed before being treated as factual content. web research is limited here by design.",
    createdAt: new Date().toISOString(),
    providerName: provider.config.provider === "gemini" ? "Google Gemini" : "Claude",
  };
}

export async function generateResearchFromProvider(request: ResearchRequest): Promise<ResearchBrief> {
  const provider = request.provider;
  const normalizedTopic = request.topic.trim();

  if (!normalizedTopic) {
    throw new Error("Enter a video topic before researching it.");
  }

  if (!provider.config.enabled || !provider.config.credentialConfigured) {
    throw new Error("Enable Gemini and configure a secure provider credential before generating research.");
  }

  try {
    const response = await provider.generateText(
      `Create a concise YouTube research brief in ${request.language} for: ${normalizedTopic}. Return JSON with keys: questions, outline, keyPoints, structure, verifiedFacts, assumptions, limitations. Each value must be an array of strings, and limitations must clearly state that web research is unavailable when it is not available. Do not invent statistics or sources.`,
      crypto.randomUUID(),
      true,
    );

    const candidate = response
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(candidate) as Partial<ResearchBrief>;

    return {
      id: crypto.randomUUID(),
      topic: normalizedTopic,
      language: request.language,
      questions: Array.isArray(parsed.questions) ? parsed.questions.map(String) : generateResearchBrief(request).questions,
      outline: Array.isArray(parsed.outline) ? parsed.outline.map(String) : generateResearchBrief(request).outline,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : generateResearchBrief(request).keyPoints,
      structure: Array.isArray(parsed.structure) ? parsed.structure.map(String) : generateResearchBrief(request).structure,
      verifiedFacts: Array.isArray(parsed.verifiedFacts) ? parsed.verifiedFacts.map(String) : [],
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : generateResearchBrief(request).assumptions,
      limitations: typeof parsed.limitations === "string" && parsed.limitations.trim() ? parsed.limitations : generateResearchBrief(request).limitations,
      createdAt: new Date().toISOString(),
      providerName: "Google Gemini",
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Gemini research generation failed.");
  }
}
