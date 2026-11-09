// NovaVid AI Studio 2.1 — Dynamic Thumbnail Engine
// Generates project-bound thumbnails dynamically — NO hardcoded demo content.
// Brand: LODHI TECHX | Founder: Umar Hayat

export interface ThumbnailProject {
  id: string;
  videoTopic: string;
  videoTitle: string;
  scriptSummary?: string;
  channelName?: string;
  channelLogo?: string;
  uploadedPhotoUrl?: string;
  selectedVisualUrl?: string;
  brandColors?: { primary: string; accent: string };
  language?: string;
  category?: string;
}

export interface ThumbnailVariation {
  id: string;
  variationType: "face_focused" | "subject_focused" | "cinematic";
  style: ThumbnailStyle;
  headline: string;
  subHeadline: string;
  badgeText: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  layout: "left_text_right_image" | "center_text" | "full_overlay";
  hasPresenterPhoto: boolean;
  hasSubjectImage: boolean;
  width: 1280;
  height: 720;
  aspectRatio: "16:9";
  estimatedFileKb: number;
  projectId: string;
  createdAt: string;
}

export type ThumbnailStyle =
  | "modern_technology"
  | "professional_documentary"
  | "educational_explainer"
  | "gaming"
  | "breaking_news"
  | "business_finance"
  | "cinematic"
  | "minimalist"
  | "personal_branding"
  | "product_review"
  | "tutorial"
  | "entertainment"
  | "custom_creator";

export const THUMBNAIL_STYLES: { id: ThumbnailStyle; name: string; accentColor: string; backgroundColor: string }[] = [
  { id: "modern_technology", name: "Modern Technology", accentColor: "#00F0FF", backgroundColor: "#050d1a" },
  { id: "professional_documentary", name: "Professional Documentary", accentColor: "#F59E0B", backgroundColor: "#0d0a04" },
  { id: "educational_explainer", name: "Educational Explainer", accentColor: "#10B981", backgroundColor: "#041a0d" },
  { id: "gaming", name: "Gaming", accentColor: "#8B5CF6", backgroundColor: "#0d0518" },
  { id: "breaking_news", name: "Breaking News", accentColor: "#EF4444", backgroundColor: "#1a0404" },
  { id: "business_finance", name: "Business & Finance", accentColor: "#3B82F6", backgroundColor: "#040d1a" },
  { id: "cinematic", name: "Cinematic", accentColor: "#D97706", backgroundColor: "#0a0a0a" },
  { id: "minimalist", name: "Minimalist", accentColor: "#6B7280", backgroundColor: "#111827" },
  { id: "personal_branding", name: "Personal Branding", accentColor: "#EC4899", backgroundColor: "#1a0410" },
  { id: "product_review", name: "Product Review", accentColor: "#F97316", backgroundColor: "#1a0804" },
  { id: "tutorial", name: "Tutorial", accentColor: "#06B6D4", backgroundColor: "#041518" },
  { id: "entertainment", name: "Entertainment", accentColor: "#FBBF24", backgroundColor: "#1a1004" },
  { id: "custom_creator", name: "Custom Creator Style", accentColor: "#A78BFA", backgroundColor: "#0f0f1a" },
];

function generateHeadline(topic: string, variationType: ThumbnailVariation["variationType"]): string {
  const cleanTopic = topic.replace(/[^\w\s]/g, "").trim().toUpperCase();
  const words = cleanTopic.split(" ").slice(0, 4).join(" ");
  switch (variationType) {
    case "face_focused": return words || "WATCH THIS NOW";
    case "subject_focused": return `${words} EXPLAINED`;
    case "cinematic": return `THE TRUTH ABOUT ${words}`;
    default: return words;
  }
}

function generateSubHeadline(_topic: string, variationType: ThumbnailVariation["variationType"]): string {
  switch (variationType) {
    case "face_focused": return "You need to see this";
    case "subject_focused": return "Complete guide & tutorial";
    case "cinematic": return "Nobody talks about this";
    default: return "Watch the full breakdown";
  }
}

function generateBadge(category?: string, variationType?: ThumbnailVariation["variationType"]): string {
  if (variationType === "face_focused") return "WATCH THIS";
  if (variationType === "cinematic") return "REVEALED";
  if (!category) return "NEW VIDEO";
  const badges: Record<string, string> = {
    technology: "TECH GUIDE", education: "LEARN NOW", gaming: "GAMEPLAY",
    finance: "MONEY TIPS", news: "BREAKING", tutorial: "HOW TO", review: "REVIEWED",
  };
  const key = Object.keys(badges).find((k) => category.toLowerCase().includes(k));
  return key ? badges[key] : "NEW VIDEO";
}

export function generateThumbnailVariations(project: ThumbnailProject, style?: ThumbnailStyle): ThumbnailVariation[] {
  const selectedStyle = THUMBNAIL_STYLES.find((s) => s.id === style) || THUMBNAIL_STYLES[0];
  const accentColor = project.brandColors?.accent || selectedStyle.accentColor;
  const bgColor = project.brandColors?.primary || selectedStyle.backgroundColor;
  const now = new Date().toISOString();

  const variations: Array<{ type: ThumbnailVariation["variationType"]; layout: ThumbnailVariation["layout"] }> = [
    { type: "face_focused", layout: "left_text_right_image" },
    { type: "subject_focused", layout: "full_overlay" },
    { type: "cinematic", layout: "center_text" },
  ];

  return variations.map(({ type, layout }, i) => ({
    id: `thumb_${project.id}_${type}_${Date.now()}_${i}`,
    variationType: type,
    style: selectedStyle.id,
    headline: generateHeadline(project.videoTopic, type),
    subHeadline: generateSubHeadline(project.videoTopic, type),
    badgeText: generateBadge(project.category, type),
    accentColor,
    backgroundColor: bgColor,
    textColor: "#FFFFFF",
    layout,
    hasPresenterPhoto: type === "face_focused" && Boolean(project.uploadedPhotoUrl),
    hasSubjectImage: type === "subject_focused" && Boolean(project.selectedVisualUrl),
    width: 1280 as const,
    height: 720 as const,
    aspectRatio: "16:9" as const,
    estimatedFileKb: 85,
    projectId: project.id,
    createdAt: now,
  }));
}

export function validateThumbnail(variation: ThumbnailVariation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (variation.width !== 1280) errors.push("Width must be 1280px");
  if (variation.height !== 720) errors.push("Height must be 720px");
  if (variation.aspectRatio !== "16:9") errors.push("Aspect ratio must be 16:9");
  if (variation.estimatedFileKb > 2048) errors.push("File size exceeds 2MB YouTube limit");
  if (!variation.headline || variation.headline.length === 0) errors.push("Headline is required");
  return { valid: errors.length === 0, errors };
}
