export type MediaAssetType = "image" | "video" | "audio" | "document";

export interface MediaAssetValidation {
  valid: boolean;
  type: MediaAssetType;
  reason?: string;
  category: string;
  sizeLimit: number;
}

export function inferMediaType(fileName: string): MediaAssetType {
  const normalized = fileName.toLowerCase();

  if (/\.(png|jpg|jpeg|webp)$/i.test(normalized)) return "image";
  if (/\.(mp4|mov|m4v|webm)$/i.test(normalized)) return "video";
  if (/\.(mp3|wav|aac)$/i.test(normalized)) return "audio";
  return "document";
}

export function validateMediaAsset(file: { name: string; size: number; type: string }): MediaAssetValidation {
  const normalizedName = file.name.trim();
  if (!normalizedName || normalizedName.includes("/") || normalizedName.includes("\\")) {
    return { valid: false, type: "document", category: "unsafe", sizeLimit: 0, reason: "Unsafe path detected in the selected file name." };
  }

  const inferred = inferMediaType(normalizedName);
  const type = file.type || inferred;
  const extension = normalizedName.split(".").pop()?.toLowerCase() ?? "";
  const supportedExtensions = {
    image: ["image/png", "image/jpeg", "image/webp"],
    video: ["video/mp4", "video/webm"],
    audio: ["audio/mpeg", "audio/wav"],
    document: ["application/pdf", "text/plain"],
  };

  if (inferred === "document" && !["pdf", "txt"].includes(extension)) {
    return { valid: false, type: inferred, category: "unsupported", sizeLimit: 15 * 1024 * 1024, reason: "Unsupported document format. Use a supported asset type or a validated file." };
  }

  if (inferred === "video" && ["mov"].includes(extension)) {
    return { valid: false, type: inferred, category: "unsupported", sizeLimit: 250 * 1024 * 1024, reason: "MOV uploads are not accepted in the current media pipeline." };
  }

  const extensionType = supportedExtensions[inferred] ?? [];
  if (inferred === "image" && !extensionType.includes(type.toLowerCase())) {
    return { valid: false, type: inferred, category: "unsupported", sizeLimit: 25 * 1024 * 1024, reason: "Unsupported image format. Use PNG, JPG, JPEG, or WebP." };
  }

  if (inferred === "video" && !extensionType.includes(type.toLowerCase())) {
    return { valid: false, type: inferred, category: "unsupported", sizeLimit: 250 * 1024 * 1024, reason: "Unsupported video format. Use MP4 or another validated video format." };
  }

  if (inferred === "audio" && !extensionType.includes(type.toLowerCase())) {
    return { valid: false, type: inferred, category: "unsupported", sizeLimit: 60 * 1024 * 1024, reason: "Unsupported audio format. Use MP3 or WAV." };
  }

  const sizeLimit = inferred === "image" ? 25 * 1024 * 1024 : inferred === "video" ? 250 * 1024 * 1024 : inferred === "audio" ? 60 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > sizeLimit) {
    return { valid: false, type: inferred, category: "too-large", sizeLimit, reason: `The file exceeds the ${sizeLimit / (1024 * 1024)} MB limit for ${inferred} assets.` };
  }

  return { valid: true, type: inferred, category: inferred, sizeLimit, reason: undefined };
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaAssetType;
  size: string;
  importedAt: string;
  projectId?: string;
  relativePath?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  checksum?: string | null;
  missing?: boolean;
}

export function detectDuplicateAsset(existingNames: string[], candidateName: string): boolean {
  return existingNames.some((name) => name.toLowerCase() === candidateName.toLowerCase());
}
