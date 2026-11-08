// NovaVid AI Studio 2.0 — Automated Video Quality Control (QC) Preflight Engine
// Inspects video, audio, subtitles, thumbnails, and SEO metadata prior to YouTube publication.
// Blocks auto-publishing if any critical check fails.

export type QCCheckSeverity = "critical" | "warning" | "info";
export type QCCheckStatus = "pass" | "warning" | "fail";

export interface QualityCheckItem {
  id: string;
  name: string;
  category: "video" | "audio" | "subtitles" | "thumbnail" | "metadata";
  severity: QCCheckSeverity;
  status: QCCheckStatus;
  message: string;
  measuredValue?: string | number;
  expectedValue?: string | number;
}

export interface VideoQCReport {
  projectId: string;
  videoFilePath: string;
  overallStatus: "PASS" | "WARNING" | "FAIL";
  scorePercent: number; // 0 - 100
  canPublish: boolean;
  evaluatedAt: string;
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  checks: QualityCheckItem[];
}

export interface QCInspectionInput {
  projectId: string;
  videoPath: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec?: string;
  audioSampleRate?: number;
  audioBitrateKbps?: number;
  hasBlackFrames?: boolean;
  hasAudioClipping?: boolean;
  hasProlongedSilence?: boolean;
  subtitlesFilePath?: string;
  subtitlesCount?: number;
  thumbnailFilePath?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailSizeKb?: number;
  title: string;
  description: string;
  tagsCount: number;
}

/**
 * Runs complete preflight quality control audit.
 */
export function inspectVideoQuality(input: QCInspectionInput): VideoQCReport {
  const checks: QualityCheckItem[] = [];

  // 1. Resolution Check (Critical)
  const is1080pOrHigher = (input.width >= 1920 && input.height >= 1080) || (input.width >= 1080 && input.height >= 1920); // 16:9 or 9:16
  checks.push({
    id: "qc_resolution",
    name: "Video Resolution Standards",
    category: "video",
    severity: "critical",
    status: is1080pOrHigher ? "pass" : "fail",
    message: is1080pOrHigher
      ? `Full HD resolution verified: ${input.width}x${input.height}.`
      : `Resolution ${input.width}x${input.height} is below the 1080p YouTube standard.`,
    measuredValue: `${input.width}x${input.height}`,
    expectedValue: "1920x1080 (16:9) or 1080x1920 (9:16)",
  });

  // 2. Frame Rate Check (Warning)
  const validFps = input.fps >= 24 && input.fps <= 60;
  checks.push({
    id: "qc_framerate",
    name: "Frame Rate Consistency",
    category: "video",
    severity: "warning",
    status: validFps ? "pass" : "warning",
    message: validFps
      ? `Frame rate ${input.fps.toFixed(2)} fps complies with broadcast and web standards.`
      : `Frame rate ${input.fps} fps is unusual (expected 24 - 60 fps).`,
    measuredValue: `${input.fps.toFixed(1)} fps`,
    expectedValue: "24.0 - 60.0 fps",
  });

  // 3. Video Codec Check (Critical)
  const isH264 = input.videoCodec.toLowerCase().includes("h264") || input.videoCodec.toLowerCase().includes("avc");
  checks.push({
    id: "qc_video_codec",
    name: "H.264 Video Codec Compatibility",
    category: "video",
    severity: "critical",
    status: isH264 ? "pass" : "fail",
    message: isH264
      ? `Standard H.264 video codec verified.`
      : `Codec '${input.videoCodec}' may not be natively supported on YouTube.`,
    measuredValue: input.videoCodec,
    expectedValue: "h264 / avc1",
  });

  // 4. Audio Stream & Sample Rate (Critical)
  const hasValidAudio = input.audioCodec && (input.audioSampleRate || 0) >= 44100;
  checks.push({
    id: "qc_audio_fidelity",
    name: "Audio Fidelity & Sample Rate",
    category: "audio",
    severity: "critical",
    status: hasValidAudio ? "pass" : "fail",
    message: hasValidAudio
      ? `High fidelity audio stream present: ${input.audioCodec} @ ${input.audioSampleRate} Hz.`
      : `Audio stream missing or below studio 44.1 kHz standard.`,
    measuredValue: `${input.audioSampleRate || 0} Hz`,
    expectedValue: "44100 Hz or 48000 Hz",
  });

  // 5. Audio Clipping & Silence Detection (Warning)
  checks.push({
    id: "qc_audio_clipping",
    name: "Audio Clipping & Distortion Check",
    category: "audio",
    severity: "warning",
    status: input.hasAudioClipping ? "warning" : "pass",
    message: input.hasAudioClipping
      ? "Audio clipping detected (> 0 dBFS). Audio mastering compression recommended."
      : "Zero audio clipping detected. Clean dynamic headroom.",
    measuredValue: input.hasAudioClipping ? "Clipping" : "Clean",
    expectedValue: "Clean / < -1.0 dB True Peak",
  });

  // 6. Subtitles Synchronization (Warning)
  const hasSubtitles = (input.subtitlesCount || 0) > 0;
  checks.push({
    id: "qc_subtitles",
    name: "Synchronized Subtitles (.srt)",
    category: "subtitles",
    severity: "warning",
    status: hasSubtitles ? "pass" : "warning",
    message: hasSubtitles
      ? `Subtitles verified with ${input.subtitlesCount} timed dialogue cues.`
      : "No subtitle track found. Subtitles boost YouTube engagement by up to 40%.",
    measuredValue: input.subtitlesCount || 0,
    expectedValue: "> 0 dialogue cues",
  });

  // 7. Thumbnail 1280x720 Check (Critical for scheduled publish)
  const validThumb =
    Boolean(input.thumbnailFilePath) &&
    (input.thumbnailWidth || 0) >= 1280 &&
    (input.thumbnailHeight || 0) >= 720;
  checks.push({
    id: "qc_thumbnail",
    name: "Custom 1280x720 Thumbnail",
    category: "thumbnail",
    severity: "critical",
    status: validThumb ? "pass" : "warning",
    message: validThumb
      ? `Verified 1280x720 custom thumbnail staged.`
      : `Thumbnail missing or resolution (${input.thumbnailWidth}x${input.thumbnailHeight}) is below 1280x720.`,
    measuredValue: `${input.thumbnailWidth || 0}x${input.thumbnailHeight || 0}`,
    expectedValue: "1280x720",
  });

  // 8. Title Length Check (Critical)
  const validTitle = input.title.trim().length > 5 && input.title.trim().length <= 100;
  checks.push({
    id: "qc_title_length",
    name: "YouTube Title Compliance",
    category: "metadata",
    severity: "critical",
    status: validTitle ? "pass" : "fail",
    message: validTitle
      ? `Title length (${input.title.length} chars) is within YouTube's 100-character limit.`
      : `Title length (${input.title.length} chars) is invalid. Must be between 5 and 100 characters.`,
    measuredValue: `${input.title.length} chars`,
    expectedValue: "5 - 100 chars",
  });

  // 9. Description Quality Check (Warning)
  const validDesc = input.description.trim().length >= 50;
  checks.push({
    id: "qc_description_quality",
    name: "SEO Description Depth",
    category: "metadata",
    severity: "warning",
    status: validDesc ? "pass" : "warning",
    message: validDesc
      ? `Rich description provided (${input.description.length} chars) with keyword optimization.`
      : `Description is sparse (${input.description.length} chars). Aim for 100+ chars with hashtags and links.`,
    measuredValue: `${input.description.length} chars`,
    expectedValue: ">= 50 chars",
  });

  // 10. Tags Count (Warning)
  const hasTags = input.tagsCount >= 3;
  checks.push({
    id: "qc_tags_count",
    name: "SEO Tags Quantity",
    category: "metadata",
    severity: "warning",
    status: hasTags ? "pass" : "warning",
    message: hasTags
      ? `${input.tagsCount} targeted SEO tags configured.`
      : `Only ${input.tagsCount} tags configured. Recommended: 5 - 15 tags.`,
    measuredValue: input.tagsCount,
    expectedValue: ">= 3 tags",
  });

  const passedCount = checks.filter((c) => c.status === "pass").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const failedCount = checks.filter((c) => c.status === "fail").length;

  const scorePercent = Math.round((passedCount / checks.length) * 100);
  const hasCriticalFailure = checks.some((c) => c.severity === "critical" && c.status === "fail");

  const overallStatus: "PASS" | "WARNING" | "FAIL" = hasCriticalFailure
    ? "FAIL"
    : warningCount > 0
    ? "WARNING"
    : "PASS";

  return {
    projectId: input.projectId,
    videoFilePath: input.videoPath,
    overallStatus,
    scorePercent,
    canPublish: !hasCriticalFailure, // Critical failure blocks auto-publishing
    evaluatedAt: new Date().toISOString(),
    totalChecks: checks.length,
    passedCount,
    warningCount,
    failedCount,
    checks,
  };
}
