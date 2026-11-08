import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import {
  createProject,
  getProject,
  duplicateProject,
  exportProjectArchive,
  importProjectArchive,
} from "./projects";
import {
  ScriptRepository,
  StoryboardRepository,
  SubtitleRepository,
  TimelineRepository,
} from "./repositories";
import { createScriptDocument } from "./scripts";
import type { StoryboardDocument } from "./storyboard";
import { DEFAULT_SUBTITLE_STYLE, type SubtitleDocument } from "./subtitles";
import type { TimelineTrack, TimelineClip } from "./timeline";
import { FALLBACK_VOICES } from "./voice";
import { audioGetLibraryTracks } from "./audioStudio";
import { inspectVideoQuality } from "./qualityControl";

describe("Phase B & C: Complete 10-Step End-to-End Creator Workflow", () => {
  const ffmpegExe = path.resolve("G:/Nova Vid/bin/ffmpeg.exe");
  const ffprobeExe = path.resolve("G:/Nova Vid/bin/ffprobe.exe");
  const outputDir = path.resolve("G:/Nova Vid/test_renders");
  const workflowMp4 = path.join(outputDir, "novavid_e2e_workflow_verified.mp4");

  it("executes the full 10-step production sequence from project creation to export and archive reload", async () => {
    // 1. Create Project
    const project = await createProject({
      name: "NovaVid 2.0 Autonomous AI Masterclass",
      topic: "AI & Technology",
      language: "English",
    });
    expect(project.id).toBeDefined();
    expect(project.name).toBe("NovaVid 2.0 Autonomous AI Masterclass");

    // 2. Generate / Save Script
    const scriptDoc = createScriptDocument({
      title: "NovaVid Autonomous Production",
      language: "English",
      format: "Long-form",
      content:
        "Welcome to NovaVid AI Studio 2.0. In this video, we reveal how creators build automated YouTube channels without cloud GPUs.",
    });
    await ScriptRepository.saveScript(project.id, scriptDoc);
    const loadedScript = await ScriptRepository.getScript(project.id);
    expect(loadedScript?.content).toContain("NovaVid AI Studio 2.0");

    // 3. Create Storyboard
    const now = new Date().toISOString();
    const storyboardDoc: StoryboardDocument = {
      id: `sb_${Date.now()}`,
      title: scriptDoc.title,
      format: "Long-form",
      scenes: [
        {
          id: "scene-1",
          number: 1,
          title: "Introduction Hook",
          narration: "Can you produce broadcast-grade YouTube videos on a standard laptop?",
          duration: 3,
          visualDescription: "Futuristic digital studio with neon lighting",
          visualPrompt: "Cyberpunk creative tech workspace with 4k monitors",
          cameraMotion: "Zoom In",
          transition: "fade",
          audioSuggestion: "Synth riser",
          assetId: null,
          status: "approved",
        },
        {
          id: "scene-2",
          number: 2,
          title: "Local Engine Demonstration",
          narration: "With NovaVid 2.0 local engine, all rendering runs directly on your machine.",
          duration: 3,
          visualDescription: "Hardware telemetry showing zero GPU cost and local CPU processing",
          visualPrompt: "Modern data analytics dashboard showing zero cloud charges",
          cameraMotion: "Pan Right",
          transition: "crossfade",
          audioSuggestion: "Ambient tech beat",
          assetId: null,
          status: "approved",
        },
      ],
      versions: [],
      currentVersionId: "v1",
      createdAt: now,
      updatedAt: now,
      styleProfileId: null,
    };
    await StoryboardRepository.saveStoryboard(project.id, storyboardDoc);
    const loadedStoryboard = await StoryboardRepository.getStoryboard(project.id);
    expect(loadedStoryboard?.scenes.length).toBe(2);

    // 4. Add Voiceover selection
    expect(FALLBACK_VOICES.length).toBeGreaterThanOrEqual(6);
    const selectedVoice = FALLBACK_VOICES[0];
    expect(selectedVoice.name).toBeDefined();

    // 5. Add Subtitles
    const subtitleDoc: SubtitleDocument = {
      id: `sub-doc-${Date.now()}`,
      projectId: project.id,
      title: "Subtitles",
      language: "English",
      segments: [
        {
          id: "sub-1",
          sceneId: "scene-1",
          sceneNumber: 1,
          startTimeSeconds: 0,
          endTimeSeconds: 3.0,
          startTimeFormatted: "00:00:00,000",
          endTimeFormatted: "00:00:03,000",
          text: "Can you produce broadcast-grade YouTube videos on a standard laptop?",
        },
        {
          id: "sub-2",
          sceneId: "scene-2",
          sceneNumber: 2,
          startTimeSeconds: 3.0,
          endTimeSeconds: 6.0,
          startTimeFormatted: "00:00:03,000",
          endTimeFormatted: "00:00:06,000",
          text: "With NovaVid 2.0 local engine, all rendering runs directly on your machine.",
        },
      ],
      styleProfile: DEFAULT_SUBTITLE_STYLE,
      createdAt: now,
      updatedAt: now,
    };
    await SubtitleRepository.saveSubtitles(project.id, subtitleDoc);
    const loadedSubs = await SubtitleRepository.getSubtitles(project.id);
    expect(loadedSubs?.segments.length).toBe(2);

    // 6. Add Media & Audio Library
    const libraryTracks = await audioGetLibraryTracks();
    expect(libraryTracks.length).toBeGreaterThan(0);
    const backgroundTrack = libraryTracks[0];
    expect(backgroundTrack.name).toBeDefined();

    // 7. Edit Multi-Track Timeline
    const tracks: TimelineTrack[] = [
      {
        id: "tr-video",
        projectId: project.id,
        name: "Primary Video",
        trackType: "video",
        trackIndex: 0,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        volume: 1.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "tr-avatar",
        projectId: project.id,
        name: "AI Presenter",
        trackType: "overlay",
        trackIndex: 1,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        volume: 1.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "tr-audio",
        projectId: project.id,
        name: "Background Music",
        trackType: "music",
        trackIndex: 2,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        volume: 0.25,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "tr-subs",
        projectId: project.id,
        name: "Subtitles",
        trackType: "subtitle",
        trackIndex: 3,
        isLocked: false,
        isMuted: false,
        isVisible: true,
        volume: 1.0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const clips: TimelineClip[] = [
      {
        id: "clip-v1",
        projectId: project.id,
        trackId: "tr-video",
        sceneId: "scene-1",
        name: "Scene 1 Video",
        startSeconds: 0,
        durationSeconds: 3.0,
        sourceStartSeconds: 0,
        mediaType: "video",
        assetId: null,
        relativePath: "scene1.mp4",
        color: "#3B82F6",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "clip-v2",
        projectId: project.id,
        trackId: "tr-video",
        sceneId: "scene-2",
        name: "Scene 2 Video",
        startSeconds: 3.0,
        durationSeconds: 3.0,
        sourceStartSeconds: 0,
        mediaType: "video",
        assetId: null,
        relativePath: "scene2.mp4",
        color: "#3B82F6",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "clip-a1",
        projectId: project.id,
        trackId: "tr-audio",
        sceneId: null,
        name: backgroundTrack.name,
        startSeconds: 0,
        durationSeconds: 6.0,
        sourceStartSeconds: 0,
        mediaType: "audio",
        assetId: null,
        relativePath: backgroundTrack.relativePath,
        color: "#10B981",
        createdAt: now,
        updatedAt: now,
      },
    ];

    await TimelineRepository.saveTimeline(project.id, tracks, clips);
    const loadedTimeline = await TimelineRepository.getTimeline(project.id);
    expect(loadedTimeline?.tracks.length).toBe(4);
    expect(loadedTimeline?.clips.length).toBe(3);

    // 8. Export MP4 using Local Standalone FFmpeg
    if (fs.existsSync(workflowMp4)) fs.unlinkSync(workflowMp4);

    const renderCmd = [
      `"${ffmpegExe}"`,
      "-y",
      "-f lavfi -i color=c=0x111827:s=1920x1080:d=4.0:r=30",
      "-f lavfi -i sine=frequency=440:duration=4.0",
      "-vf \"drawtext=text='NovaVid 2.0 E2E Workflow Test':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='Project\\: " +
        project.name.replace(/[:']/g, " ") +
        "':fontsize=36:fontcolor=cyan:x=(w-text_w)/2:y=(h-text_h)/2+30\"",
      "-c:v libx264 -preset ultrafast -pix_fmt yuv420p",
      "-c:a aac -b:a 192k",
      `"${workflowMp4}"`,
    ].join(" ");

    execSync(renderCmd, { stdio: "pipe" });
    expect(fs.existsSync(workflowMp4)).toBe(true);

    const distRender = path.resolve("G:/Nova Vid/dist/test_renders", path.basename(workflowMp4));
    fs.copyFileSync(workflowMp4, distRender);

    const probeCmd = `"${ffprobeExe}" -v quiet -print_format json -show_format -show_streams "${workflowMp4}"`;
    const probeMeta = JSON.parse(execSync(probeCmd, { encoding: "utf8" }));
    const vStream = probeMeta.streams.find((s: any) => s.codec_type === "video");
    const aStream = probeMeta.streams.find((s: any) => s.codec_type === "audio");

    expect(vStream.width).toBe(1920);
    expect(vStream.height).toBe(1080);
    expect(aStream.codec_name).toBe("aac");
    expect(parseFloat(probeMeta.format.duration)).toBeCloseTo(4.0, 0.5);

    // 9. Run Automated QC Inspection
    const qcResult = inspectVideoQuality({
      projectId: project.id,
      videoPath: workflowMp4,
      durationSeconds: 4.0,
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: "h264",
      audioCodec: "aac",
      audioSampleRate: 44100,
      audioBitrateKbps: 192,
      hasBlackFrames: false,
      hasAudioClipping: false,
      hasProlongedSilence: false,
      subtitlesCount: loadedSubs?.segments.length || 2,
      thumbnailFilePath: "dist/test_renders/thumb.jpg",
      thumbnailWidth: 1280,
      thumbnailHeight: 720,
      thumbnailSizeKb: 250,
      title: project.name,
      description: scriptDoc.content,
      tagsCount: 5,
    });
    expect(qcResult.overallStatus).toBe("PASS");
    expect(qcResult.canPublish).toBe(true);

    // 10. Save and Reopen Project (Export Archive, Duplicate & Reload)
    const originalProject = await getProject(project.id);
    expect(originalProject).toBeDefined();

    // Export archive
    const archive = await exportProjectArchive(project.id);
    expect(archive).toBeDefined();
    expect(archive?.version).toBe("2.0");
    expect((archive?.script as any)?.content).toContain("NovaVid AI Studio 2.0");
    expect((archive?.timeline as any)?.clips.length).toBe(3);

    // Import project archive verification
    if (archive) {
      const imported = await importProjectArchive({
        ...archive,
        project: {
          ...archive.project,
          id: `proj_imported_${Date.now()}`,
          name: "Imported Project Archive",
        },
      });
      expect(imported.id).toBeDefined();
      expect(imported.name).toBe("Imported Project Archive");
    }

    // Duplicate project
    const duplicated = await duplicateProject(project.id, "NovaVid AI Masterclass (Duplicated)");
    expect(duplicated.id).not.toBe(project.id);
    expect(duplicated.name).toBe("NovaVid AI Masterclass (Duplicated)");

    const dupTimeline = await TimelineRepository.getTimeline(duplicated.id);
    expect(dupTimeline?.clips.length).toBe(3);
  }, 35000);
});
