const fs = require("fs");
const path = require("path");

const repoPath = path.join(__dirname, "..", "src", "lib", "repositories.ts");
let c = fs.readFileSync(repoPath, "utf8");

// AudioClipRepository helper
if (!c.includes("getClipsForProject")) {
  c = c.replace(
    "static async listAudioClips(projectId: string): Promise<GeneratedAudioClip[]> {",
    "static async getClipsForProject(projectId: string): Promise<GeneratedAudioClip[]> {\n    return this.listAudioClips(projectId);\n  }\n\n  static async listAudioClips(projectId: string): Promise<GeneratedAudioClip[]> {"
  );
}

// SubtitleRepository helper
if (!c.includes("getSubtitleDocument")) {
  c = c.replace(
    "static async getSubtitles(projectId: string): Promise<SubtitleDocument | null> {",
    "static async getSubtitleDocument(projectId: string): Promise<SubtitleDocument | null> {\n    return this.getSubtitles(projectId);\n  }\n\n  static async getSubtitles(projectId: string): Promise<SubtitleDocument | null> {"
  );
}

// TimelineRepository helpers
if (!c.includes("getTimelineDocument")) {
  c = c.replace(
    "static async getTimeline(projectId: string): Promise<TimelineDocument> {",
    "static async getTimelineDocument(projectId: string): Promise<TimelineDocument> {\n    return this.getTimeline(projectId);\n  }\n\n  static async saveTracks(tracks: TimelineTrack[]): Promise<void> {\n    if (tracks.length === 0) return;\n    const projectId = tracks[0].projectId;\n    const existing = await this.getTimeline(projectId);\n    return this.saveTimeline(projectId, tracks, existing.clips);\n  }\n\n  static async saveClips(projectId: string, clips: TimelineClip[]): Promise<void> {\n    const existing = await this.getTimeline(projectId);\n    return this.saveTimeline(projectId, existing.tracks, clips);\n  }\n\n  static async getTimeline(projectId: string): Promise<TimelineDocument> {"
  );
}

// RenderJobRepository helpers
if (!c.includes("saveJob")) {
  c = c.replace(
    "static async saveRenderJob(job: RenderJobRecord): Promise<void> {",
    "static async saveJob(job: RenderJobRecord): Promise<void> {\n    return this.saveRenderJob(job);\n  }\n\n  static async getJobsForProject(projectId: string): Promise<RenderJobRecord[]> {\n    return this.listRenderJobs(projectId);\n  }\n\n  static async updateJobStatus(jobId: string, status: \"pending\" | \"rendering\" | \"completed\" | \"failed\" | \"cancelled\", progress: number, errorMessage?: string): Promise<void> {\n    const db = await getDatabase();\n    await db.execute(\n      `UPDATE render_jobs SET status = $1, progress = $2, error_message = $3, updated_at = $4 WHERE id = $5;`,\n      [status, progress, errorMessage || null, new Date().toISOString(), jobId]\n    );\n  }\n\n  static async saveRenderJob(job: RenderJobRecord): Promise<void> {"
  );
}

fs.writeFileSync(repoPath, c, "utf8");
console.log("repositories.ts updated successfully with Stage C helpers");
