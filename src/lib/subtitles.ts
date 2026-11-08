import type { StoryboardDocument } from "./storyboard";
import type { GeneratedAudioClip } from "./voice";

export interface SubtitleSegment {
  id: string;
  sceneId: string;
  sceneNumber: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  startTimeFormatted: string; // "00:00:01,200"
  endTimeFormatted: string;   // "00:00:03,800"
  text: string;
}

export interface SubtitleStyleProfile {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  position: "bottom" | "middle" | "top";
  alignment: "center" | "left" | "right";
}

export interface SubtitleDocument {
  id: string;
  projectId: string;
  title: string;
  language: string;
  segments: SubtitleSegment[];
  styleProfile: SubtitleStyleProfile;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyleProfile = {
  id: "style-creator-default",
  name: "Classic YouTube Clean",
  fontFamily: "Inter, sans-serif",
  fontSize: 22,
  textColor: "#FFFFFF",
  outlineColor: "#000000",
  outlineWidth: 2,
  backgroundColor: "rgba(0, 0, 0, 0.70)",
  position: "bottom",
  alignment: "center",
};

export const URDU_SUBTITLE_STYLE: SubtitleStyleProfile = {
  id: "style-urdu-nastaliq",
  name: "Urdu Nastaliq Cinema",
  fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', Arial, sans-serif",
  fontSize: 26,
  textColor: "#FFD700", // warm gold
  outlineColor: "#1A1A1A",
  outlineWidth: 3,
  backgroundColor: "rgba(0, 0, 0, 0.80)",
  position: "bottom",
  alignment: "center",
};

/**
 * Checks if a string contains Arabic/Urdu/Persian RTL characters.
 */
export function isRTLText(text: string): boolean {
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlRegex.test(text);
}

export function getLanguageDirection(language: string, sampleText?: string): "rtl" | "ltr" {
  if (language.toLowerCase() === "urdu") return "rtl";
  if (sampleText && isRTLText(sampleText)) return "rtl";
  return "ltr";
}

/**
 * Formats seconds into SRT timestamp format: HH:MM:SS,mmm
 */
export function formatTimestampSRT(seconds: number): string {
  const validSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const hrs = Math.floor(validSec / 3600);
  const mins = Math.floor((validSec % 3600) / 60);
  const secs = Math.floor(validSec % 60);
  const millis = Math.floor((validSec % 1) * 1000);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

/**
 * Formats seconds into WebVTT timestamp format: HH:MM:SS.mmm
 */
export function formatTimestampVTT(seconds: number): string {
  const validSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const hrs = Math.floor(validSec / 3600);
  const mins = Math.floor((validSec % 3600) / 60);
  const secs = Math.floor(validSec % 60);
  const millis = Math.floor((validSec % 1) * 1000);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/**
 * Parses timestamp string (either SRT with comma or VTT with dot) into seconds.
 */
export function parseTimestamp(formatted: string): number {
  const clean = formatted.trim().replace(",", ".");
  const parts = clean.split(":");
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  }
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(clean) || 0;
}

/**
 * Breaks narration text into bite-sized subtitle lines (4-8 words per segment or punctuation breaks).
 */
export function chunkNarrationText(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];

  // Split on sentence boundaries first
  const sentences = clean.split(/(?<=[.!?؟।\n])\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= 8) {
      chunks.push(sentence.trim());
    } else {
      // Split into 5-6 word chunks
      let cur: string[] = [];
      for (const w of words) {
        cur.push(w);
        if (cur.length >= 6) {
          chunks.push(cur.join(" "));
          cur = [];
        }
      }
      if (cur.length > 0) {
        chunks.push(cur.join(" "));
      }
    }
  }

  return chunks.length > 0 ? chunks : [clean];
}

/**
 * Generates subtitle segments aligned to scene narration and real audio durations.
 * Uses honest audio duration proportional alignment.
 */
export function generateSubtitlesFromStoryboard(
  projectId: string,
  storyboard: StoryboardDocument,
  audioClipsByScene: Record<string, GeneratedAudioClip> = {},
): SubtitleDocument {
  const segments: SubtitleSegment[] = [];
  let currentTime = 0.0;

  for (const scene of storyboard.scenes) {
    const text = scene.narration.trim() || scene.title.trim();
    if (!text) continue;

    // Use exact real audio duration if present, otherwise scene duration
    const clip = audioClipsByScene[scene.id];
    const sceneDuration = clip && clip.durationSeconds > 0 ? clip.durationSeconds : Math.max(2.0, scene.duration);

    const chunks = chunkNarrationText(text);
    const totalChars = chunks.reduce((acc, c) => acc + c.length, 0);

    let sceneCurrent = currentTime;
    for (const chunk of chunks) {
      const proportion = totalChars > 0 ? chunk.length / totalChars : 1 / chunks.length;
      const chunkDuration = Math.max(1.0, sceneDuration * proportion);
      const start = sceneCurrent;
      const end = Math.min(currentTime + sceneDuration, start + chunkDuration);

      segments.push({
        id: `sub-${crypto.randomUUID()}`,
        sceneId: scene.id,
        sceneNumber: scene.number,
        startTimeSeconds: Math.round(start * 1000) / 1000,
        endTimeSeconds: Math.round(end * 1000) / 1000,
        startTimeFormatted: formatTimestampSRT(start),
        endTimeFormatted: formatTimestampSRT(end),
        text: chunk,
      });

      sceneCurrent = end;
    }

    currentTime += sceneDuration;
  }

  const isUrdu = isRTLText(storyboard.scenes.map((s) => s.narration).join(" "));

  return {
    id: `subdoc-${crypto.randomUUID()}`,
    projectId,
    title: `${storyboard.title} Subtitles`,
    language: isUrdu ? "Urdu" : "English",
    segments,
    styleProfile: isUrdu ? URDU_SUBTITLE_STYLE : DEFAULT_SUBTITLE_STYLE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Exports subtitle segments into valid SRT format.
 */
export function exportToSRT(segments: SubtitleSegment[]): string {
  return segments
    .map((seg, idx) => {
      const index = idx + 1;
      const start = formatTimestampSRT(seg.startTimeSeconds);
      const end = formatTimestampSRT(seg.endTimeSeconds);
      return `${index}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

/**
 * Exports subtitle segments into valid WebVTT format.
 */
export function exportToWebVTT(segments: SubtitleSegment[], title?: string): string {
  const header = `WEBVTT${title ? ` - ${title}` : ""}\n\n`;
  const body = segments
    .map((seg, idx) => {
      const index = idx + 1;
      const start = formatTimestampVTT(seg.startTimeSeconds);
      const end = formatTimestampVTT(seg.endTimeSeconds);
      return `${index}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");

  return header + body;
}

/**
 * Parses SRT content string into SubtitleSegment objects.
 */
export function parseSRT(srtContent: string): SubtitleSegment[] {
  const blocks = srtContent.trim().split(/\n\s*\n/);
  const segments: SubtitleSegment[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    // Check if line 0 is index or timestamp
    let timeLineIdx = 1;
    if (lines[0].includes("-->")) {
      timeLineIdx = 0;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes("-->")) continue;

    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
    const startSec = parseTimestamp(startStr);
    const endSec = parseTimestamp(endStr);
    const textLines = lines.slice(timeLineIdx + 1).join(" ").trim();

    segments.push({
      id: `sub-${crypto.randomUUID()}`,
      sceneId: "",
      sceneNumber: segments.length + 1,
      startTimeSeconds: startSec,
      endTimeSeconds: endSec,
      startTimeFormatted: formatTimestampSRT(startSec),
      endTimeFormatted: formatTimestampSRT(endSec),
      text: textLines,
    });
  }

  return segments;
}

/**
 * Parses WebVTT content string into SubtitleSegment objects.
 */
export function parseWebVTT(vttContent: string): SubtitleSegment[] {
  const clean = vttContent.replace(/^WEBVTT[^\n]*\n+/i, "").trim();
  const blocks = clean.split(/\n\s*\n/);
  const segments: SubtitleSegment[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length === 0) continue;

    let timeLineIdx = 0;
    if (!lines[0].includes("-->") && lines.length > 1 && lines[1].includes("-->")) {
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes("-->")) continue;

    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim().split(" ")[0]);
    const startSec = parseTimestamp(startStr);
    const endSec = parseTimestamp(endStr);
    const textLines = lines.slice(timeLineIdx + 1).join(" ").trim();

    segments.push({
      id: `sub-${crypto.randomUUID()}`,
      sceneId: "",
      sceneNumber: segments.length + 1,
      startTimeSeconds: startSec,
      endTimeSeconds: endSec,
      startTimeFormatted: formatTimestampSRT(startSec),
      endTimeFormatted: formatTimestampSRT(endSec),
      text: textLines,
    });
  }

  return segments;
}
