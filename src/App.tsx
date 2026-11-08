import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  createProject,
  deleteProject,
  listProjects,
  safeUUID,
  updateProject,
} from "./lib/projects";
import {
  normalizeProjectInput,
  PROJECT_LANGUAGES,
  type Project,
  type ProjectInput,
  type ProjectLanguage,
} from "./lib/project";
import {
  DEFAULT_SETTINGS,
  normalizeStudioSettings,
  persistStoredSettings,
  PROJECT_CATEGORIES,
  PROJECT_FORMATS,
  readStoredSettings,
  THEMES,
  type StudioSettings,
} from "./lib/settings";
import {
  DEFAULT_PROVIDER_CONFIG,
  GeminiProviderAdapter,
  getProviderCredentialStatus,
  restoreProviderConfig,
  serializeProviderConfig,
  type ProviderConfig,
} from "./lib/providers";
import {
  validateImageGenerationConfig,
  type ImageGenerationConfig,
} from "./lib/imageProviders";
import {
  validateMediaAsset,
  detectDuplicateAsset,
  type MediaAsset,
} from "./lib/media";
import {
  ResearchRepository,
  ScriptRepository,
  StoryboardRepository,
  VisualStyleRepository,
  MediaRepository,
  ProviderConfigRepository,
  SettingsRepository,
  AudioClipRepository,
  SubtitleRepository,
  migrateBrowserDataToSQLite,
} from "./lib/repositories";
import type { GeneratedAudioClip } from "./lib/voice";
import type { SubtitleDocument } from "./lib/subtitles";
import { FALLBACK_GEMINI_CATALOG } from "./lib/models";
import {
  pickAndImportMediaFiles,
  verifyProjectMediaFiles,
  deleteProjectMediaAsset,
  isTauriEnvironment,
} from "./lib/nativeMedia";
import {
  convertScriptToStoryboard,
  createVisualStyleProfile,
  duplicateScene,
  removeScene,
  reorderScenes,
  splitScene,
  updateScene,
  type StoryboardDocument,
  type StoryboardScene,
  type VisualStyleProfile,
} from "./lib/storyboard";
import {
  generateResearchFromProvider,
  type ResearchBrief,
} from "./lib/research";
import {
  buildScriptContent,
  createScriptDocument,
  createScriptVersion,
  restoreScriptVersion,
  type ScriptDocument,
  type ScriptFormat,
} from "./lib/scripts";
import { VoiceStudioPage } from "./components/VoiceStudioPage";
import { SubtitleStudioPage } from "./components/SubtitleStudioPage";
import { TimelineStudioPage } from "./components/TimelineStudioPage";
import { ExportManagerPage } from "./components/ExportManagerPage";
import { VisualStudioPage } from "./components/VisualStudioPage";
import { AudioStudioPage } from "./components/AudioStudioPage";
import { AgentStudioPage } from "./components/AgentStudioPage";
import { SEOStudioPage } from "./components/SEOStudioPage";
import { PublishingStudioPage } from "./components/PublishingStudioPage";
import { AnalyticsStudioPage } from "./components/AnalyticsStudioPage";
import { WorkstationShortcutsModal } from "./components/WorkstationShortcutsModal";
import { LicensingStudioPage } from "./components/LicensingStudioPage";
import { AdminSaaSPanel } from "./components/AdminSaaSPanel";
import { CustomerSaaSPanel } from "./components/CustomerSaaSPanel";
import { FFmpegSetupModal } from "./components/FFmpegSetupModal";
import { CreatorWorkspacePage } from "./components/CreatorWorkspacePage";
import { GoogleYouTubeConnectionCenter } from "./components/GoogleYouTubeConnectionCenter";
import { BetaFeedbackModal } from "./components/BetaFeedbackModal";
import { OneClickVideoCreator } from "./components/OneClickVideoCreator";
import {
  getStoredResourceMode,
  setStoredResourceMode,
  startResourceMonitoring,
  type ResourceMode,
  type SystemResourceMetrics,
} from "./lib/resourceManager";
import "./App.css";

type View = "dashboard" | "agent" | "creator" | "projects" | "media" | "settings" | "providers" | "google_youtube" | "research" | "scripts" | "storyboard" | "visuals" | "voice" | "subtitles" | "audio" | "timeline" | "export" | "seo" | "publish" | "analytics" | "license" | "customer_saas" | "admin_saas";
type StorageState = "connecting" | "ready" | "error";
export type UserMode = "beginner" | "creator" | "advanced";

const URDU_NAV_LABELS: Record<string, string> = {
  Overview: "ڈیش بورڈ / جائزہ",
  "AI Agent (Auto)": "خودکار اے آئی ایجنٹ",
  "Creator Workspace": "تخلیقی ورک اسپیس",
  "Google & YouTube": "گوگل و یوٹیوب سنٹر",
  Projects: "پروجیکٹس",
  "Media library": "میڈیا لائبریری",
  "AI Providers": "اے آئی ماڈلز و کلید",
  "AI Research": "اے آئی ریسرچ",
  "Script Studio": "اسکرپٹ اسٹوڈیو",
  Storyboard: "اسٹوری بورڈ",
  "Visual Studio": "تصویری اسٹوڈیو",
  "Voice / TTS": "وائس اوور / آواز",
  Subtitles: "سب ٹائٹلز",
  "Audio & Music": "موسیقی و آڈیو",
  "Timeline Editor": "ٹائم لائن ایڈیٹر",
  "Video Export": "ویڈیو ایکسپورٹ",
  "YouTube SEO": "یوٹیوب ایس ای او",
  Publishing: "یوٹیوب پبلشنگ",
  Analytics: "اینالیٹکس و کارکردگی",
  "Plans & Licensing": "لائسنس و پلانز",
  "Customer SaaS": "کسٹمر پورٹل",
  "Admin SaaS": "ایڈمن پورٹل",
  Settings: "سیٹنگز",
};

const URDU_PAGE_TITLES: Record<string, string> = {
  dashboard: "ڈیش بورڈ اور جائزہ",
  agent: "خودکار یوٹیوب اے آئی ایجنٹ",
  creator: "تخلیقی ورک اسپیس اور چینلز",
  google_youtube: "گوگل و یوٹیوب سنٹر",
  projects: "میرے پروجیکٹس",
  media: "میڈیا لائبریری",
  providers: "اے آئی ماڈلز و پرووائیڈرز",
  research: "اے آئی ریسرچ اسٹوڈیو",
  scripts: "اسکرپٹ اسٹوڈیو",
  storyboard: "اسٹوری بورڈ اسٹوڈیو",
  visuals: "تصویری اسٹوڈیو",
  voice: "وائس اوور اسٹوڈیو",
  subtitles: "سب ٹائٹلز اسٹوڈیو",
  audio: "آڈیو و موسیقی اسٹوڈیو",
  timeline: "ٹائم لائن ایڈیٹر",
  export: "ویڈیو ایکسپورٹ و رینڈر",
  seo: "یوٹیوب ایس ای او",
  publish: "یوٹیوب پبلشنگ",
  analytics: "اینالیٹکس و کارکردگی",
  license: "لائسنسنگ و پلانز",
  customer_saas: "کسٹمر پورٹل",
  admin_saas: "ایڈمن پورٹل",
  settings: "سیٹنگز",
};

const navigation = [
  { label: "Overview", view: "dashboard" as const, icon: "grid" },
  { label: "AI Agent (Auto)", view: "agent" as const, icon: "spark" },
  { label: "Creator Workspace", view: "creator" as const, icon: "spark" },
  { label: "Google & YouTube", view: "google_youtube" as const, icon: "spark" },
  { label: "Projects", view: "projects" as const, icon: "folder" },
  { label: "Media library", view: "media" as const, icon: "media" },
  { label: "AI Providers", view: "google_youtube" as const, icon: "spark" },
  { label: "AI Research", view: "research" as const, icon: "search" },
  { label: "Script Studio", view: "scripts" as const, icon: "script" },
  { label: "Storyboard", view: "storyboard" as const, icon: "video" },
  { label: "Visual Studio", view: "visuals" as const, icon: "image" },
  { label: "Voice / TTS", view: "voice" as const, icon: "mic" },
  { label: "Subtitles", view: "subtitles" as const, icon: "subtitles" },
  { label: "Audio & Music", view: "audio" as const, icon: "music" },
  { label: "Timeline Editor", view: "timeline" as const, icon: "film" },
  { label: "Video Export", view: "export" as const, icon: "render" },
  { label: "YouTube SEO", view: "seo" as const, icon: "search" },
  { label: "Publishing", view: "publish" as const, icon: "send" },
  { label: "Analytics", view: "analytics" as const, icon: "trend" },
  { label: "Plans & Licensing", view: "license" as const, icon: "key" },
  { label: "Customer SaaS", view: "customer_saas" as const, icon: "user" },
  { label: "Admin SaaS", view: "admin_saas" as const, icon: "shield" },
  { label: "Settings", view: "settings" as const, icon: "settings" },
];

const plannedNavigation = [
  { label: "Content planner", icon: "calendar" },

];

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageState, setStorageState] = useState<StorageState>("connecting");
  const [storageIssue, setStorageIssue] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<Project | null | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() =>
    readStoredSettings(window.localStorage),
  );
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(() =>
    readStoredProviderConfig(),
  );
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => readStoredMedia());
  const [researchBrief, setResearchBrief] = useState<ResearchBrief | null>(() =>
    readStoredResearchBrief(),
  );
  const [storyboard, setStoryboard] = useState<StoryboardDocument | null>(() =>
    readStoredStoryboard(),
  );
  const [visualStyleProfile, setVisualStyleProfile] = useState<VisualStyleProfile>(() =>
    readStoredVisualStyleProfile(),
  );
  const [imageGenerationConfig, setImageGenerationConfig] = useState<ImageGenerationConfig>(() =>
    readStoredImageGenerationConfig(),
  );
  const [scriptDocument, setScriptDocument] = useState<ScriptDocument | null>(() =>
    readStoredScriptDocument(),
  );
  const [audioClips, setAudioClips] = useState<GeneratedAudioClip[]>([]);
  const [subtitlesDoc, setSubtitlesDoc] = useState<SubtitleDocument | null>(null);
  const [researchTopic, setResearchTopic] = useState("");
  const [researchLanguage, setResearchLanguage] = useState<ProjectLanguage>("English");
  const [scriptTitle, setScriptTitle] = useState("Untitled script");
  const [scriptFormat, setScriptFormat] = useState<ScriptFormat>("Long-form");
  const [scriptLanguage, setScriptLanguage] = useState<ProjectLanguage>("English");
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFFmpegSetupOpen, setIsFFmpegSetupOpen] = useState(false);
  const [isBetaFeedbackOpen, setIsBetaFeedbackOpen] = useState(false);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Phase 2 & Phase 3: Desktop UI 2.0 Modes, Urdu RTL, & 8GB RAM Protection
  const [userMode, setUserMode] = useState<UserMode>(() => {
    try {
      const saved = localStorage.getItem("novavid_user_mode");
      if (saved === "beginner" || saved === "creator" || saved === "advanced") return saved;
    } catch {}
    return "beginner";
  });

  const [uiLanguage, setUiLanguage] = useState<"en" | "ur">(() => {
    try {
      const saved = localStorage.getItem("novavid_ui_lang");
      if (saved === "en" || saved === "ur") return saved;
    } catch {}
    return "en";
  });

  const [resourceMetrics, setResourceMetrics] = useState<SystemResourceMetrics | null>(null);
  const [resourceMode, setResourceMode] = useState<ResourceMode>(() => getStoredResourceMode());

  useEffect(() => {
    const stop = startResourceMonitoring((metrics, mode) => {
      setResourceMetrics(metrics);
      setResourceMode(mode);
    });
    return stop;
  }, []);

  useEffect(() => {
    document.documentElement.dir = uiLanguage === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = uiLanguage;
    if (uiLanguage === "ur") {
      document.body.classList.add("rtl-layout");
    } else {
      document.body.classList.remove("rtl-layout");
    }
    try {
      localStorage.setItem("novavid_ui_lang", uiLanguage);
    } catch {}
  }, [uiLanguage]);

  const handleSetUserMode = (mode: UserMode) => {
    setUserMode(mode);
    try {
      localStorage.setItem("novavid_user_mode", mode);
    } catch {}
  };

  const handleCycleResourceMode = () => {
    const cycle: ResourceMode[] = ["low_resource", "balanced", "performance"];
    const idx = cycle.indexOf(resourceMode);
    const next = cycle[(idx + 1) % cycle.length];
    setResourceMode(next);
    setStoredResourceMode(next);
    setQuickToast(`Resource Mode: ${next.toUpperCase()}`);
    setTimeout(() => setQuickToast(null), 2000);
  };

  const handleToggleUiLanguage = () => {
    setUiLanguage((prev) => (prev === "en" ? "ur" : "en"));
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.key === "?" && !isInput) || (e.ctrlKey && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setView("agent");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setView("export");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setView("publish");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        setView("analytics");
      } else if (e.ctrlKey && (e.key === "S" || e.key === "s") && !e.shiftKey) {
        e.preventDefault();
        setQuickToast("âœ“ Project state synced to SQLite");
        setTimeout(() => setQuickToast(null), 2500);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = studioSettings.theme;
  }, [studioSettings.theme]);

  useEffect(() => {
    persistStoredSettings(window.localStorage, studioSettings);
    SettingsRepository.saveSettings(studioSettings).catch(() => undefined);
  }, [studioSettings]);

  useEffect(() => {
    persistStoredProviderConfig(providerConfig);
    ProviderConfigRepository.saveProviderConfig(providerConfig).catch(() => undefined);
  }, [providerConfig]);

  useEffect(() => {
    persistStoredMedia(mediaAssets);
  }, [mediaAssets]);

  useEffect(() => {
    if (researchBrief) {
      persistStoredResearchBrief(researchBrief);
      const pid = selectedProjectId || "default";
      ResearchRepository.saveResearch(pid, researchBrief).catch(() => undefined);
    }
  }, [researchBrief, selectedProjectId]);

  useEffect(() => {
    if (scriptDocument) {
      persistStoredScriptDocument(scriptDocument);
      const pid = selectedProjectId || "default";
      ScriptRepository.saveScript(pid, scriptDocument).catch(() => undefined);
    }
  }, [scriptDocument, selectedProjectId]);

  useEffect(() => {
    if (storyboard) {
      persistStoredStoryboard(storyboard);
      const pid = selectedProjectId || "default";
      StoryboardRepository.saveStoryboard(pid, storyboard).catch(() => undefined);
    }
  }, [storyboard, selectedProjectId]);

  useEffect(() => {
    persistStoredVisualStyleProfile(visualStyleProfile);
    const pid = selectedProjectId || "default";
    VisualStyleRepository.saveVisualStyle(pid, visualStyleProfile).catch(() => undefined);
  }, [visualStyleProfile, selectedProjectId]);

  useEffect(() => {
    persistStoredImageGenerationConfig(imageGenerationConfig);
  }, [imageGenerationConfig]);

  async function refreshProjects() {
    try {
      const savedProjects = await listProjects();
      setProjects(savedProjects);
      setStorageState("ready");
      setStorageIssue(null);
    } catch (error) {
      setStorageState("error");
      setStorageIssue(errorMessage(error));
      throw error;
    }
  }

  useEffect(() => {
    refreshProjects().catch(() => undefined);
  }, []);

  // Load initial settings and provider config from SQLite repositories
  useEffect(() => {
    SettingsRepository.getSettings()
      .then((saved) => {
        if (saved) setStudioSettings(saved);
      })
      .catch(() => undefined);

    ProviderConfigRepository.getProviderConfig("gemini")
      .then((saved) => {
        if (saved) {
          setProviderConfig((current) => ({
            ...current,
            ...saved,
            usage: current.usage,
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  // Safe migration and project data loading
  useEffect(() => {
    if (storageState !== "ready") return;
    const pid = selectedProjectId || projects[0]?.id;
    if (!pid) return;

    // Perform safe non-destructive migration of any legacy browser data
    migrateBrowserDataToSQLite(pid, window.localStorage).catch(() => undefined);

    // Load project-scoped SQLite data
    ResearchRepository.getResearch(pid)
      .then((brief) => {
        if (brief) setResearchBrief(brief);
      })
      .catch(() => undefined);

    ScriptRepository.getScript(pid)
      .then((doc) => {
        if (doc) setScriptDocument(doc);
      })
      .catch(() => undefined);

    StoryboardRepository.getStoryboard(pid)
      .then((sb) => {
        if (sb) setStoryboard(sb);
      })
      .catch(() => undefined);

    VisualStyleRepository.getVisualStyle(pid)
      .then((style) => {
        if (style) setVisualStyleProfile(style);
      })
      .catch(() => undefined);

    MediaRepository.listMediaAssets(pid)
      .then((assets) => {
        if (assets.length > 0) setMediaAssets(assets);
      })
      .catch(() => undefined);

    verifyProjectMediaFiles(pid)
      .then((verified) => {
        if (verified.length > 0) setMediaAssets(verified);
      })
      .catch(() => undefined);

    AudioClipRepository.listAudioClips(pid)
      .then((clips) => setAudioClips(clips))
      .catch(() => undefined);

    SubtitleRepository.getSubtitles(pid)
      .then((doc) => {
        if (doc) setSubtitlesDoc(doc);
      })
      .catch(() => undefined);
  }, [selectedProjectId, storageState, projects]);

  useEffect(() => {
    getProviderCredentialStatus("gemini")
      .then((credentialConfigured) => setProviderConfig((current) => ({ ...current, credentialConfigured })))
      .catch(() => setProviderConfig((current) => ({ ...current, credentialConfigured: false })));
  }, []);

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.name.toLocaleLowerCase().includes(query) ||
        project.topic.toLocaleLowerCase().includes(query),
    );
  }, [projects, search]);

  const draftCount = projects.filter((project) => project.status === "draft").length;
  const productionCount = projects.filter(
    (project) => project.status === "in_progress",
  ).length;
  const completedCount = projects.filter(
    (project) => project.status === "completed",
  ).length;

  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setScriptTitle(proj.name);
      setScriptLanguage(proj.language);
      setResearchTopic(proj.topic);
    }
  }

  async function saveProject(input: ProjectInput, existing: Project | null) {
    const normalized = normalizeProjectInput(input);
    if (existing) {
      await updateProject(existing.id, normalized);
      handleSelectProject(existing.id);
    } else {
      const created = await createProject(normalized);
      setSelectedProjectId(created.id);
      setScriptTitle(created.name);
      setScriptLanguage(created.language);
      setResearchTopic(created.topic);
    }
    await refreshProjects();
  }

  async function removeProject(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This removes the project record from this workspace.`,
    );
    if (!confirmed) return;

    try {
      await deleteProject(project.id);
      if (selectedProjectId === project.id) setSelectedProjectId(null);
      await refreshProjects();
    } catch (error) {
      setStorageIssue(errorMessage(error));
    }
  }

  const englishPageTitle =
    view === "dashboard"
      ? "Overview"
      : view === "agent"
        ? "Autonomous YouTube AI Agent"
      : view === "creator"
        ? "Creator Workspace & Channels"
      : view === "google_youtube"
        ? "Google & YouTube Connection Center"
      : view === "projects"
        ? "Projects"
        : view === "media"
          ? "Media library"
          : view === "providers"
            ? "AI Providers"
            : view === "research"
              ? "AI Research"
              : view === "scripts"
                ? "Script Studio"
                : view === "storyboard"
                  ? "Storyboard Studio"
                  : view === "visuals"
                    ? "AI Visual Asset Studio"
                  : view === "voice"
                    ? "Voice / TTS Studio"
                    : view === "subtitles"
                      ? "Subtitle Studio"
                    : view === "audio"
                      ? "Audio & Sound Design Studio"
                      : view === "timeline"
                        ? "Timeline Studio"
                        : view === "export"
                          ? "Video Export & Render"
                        : view === "seo"
                          ? "YouTube SEO & Metadata Studio"
                        : view === "publish"
                          ? "YouTube OAuth & Publishing Studio"
                        : view === "analytics"
                          ? "Analytics & Performance Intelligence Studio"
                        : view === "license"
                          ? "Commercial SaaS & Licensing Studio"
                      : "Settings";

  const pageTitle = uiLanguage === "ur"
    ? (URDU_PAGE_TITLES[view] || englishPageTitle)
    : englishPageTitle;

  const filteredNavigation = useMemo(() => {
    if (userMode === "beginner") {
      return navigation.filter((item) =>
        ["dashboard", "agent", "projects", "publish", "settings"].includes(item.view)
      );
    }
    if (userMode === "creator") {
      return navigation.filter((item) =>
        !["license", "customer_saas", "admin_saas", "analytics", "research", "providers"].includes(item.view)
      );
    }
    return navigation; // Advanced mode shows all
  }, [userMode]);

  async function handleNativeMediaImport() {
    try {
      const pid = selectedProjectId || projects[0]?.id || "default";
      const imported = await pickAndImportMediaFiles(pid);
      if (imported.length > 0) {
        const refreshed = await MediaRepository.listMediaAssets(pid);
        setMediaAssets(refreshed);
      }
    } catch (error) {
      setStorageIssue(errorMessage(error));
    }
  }

  async function handleDeleteMediaAsset(asset: MediaAsset) {
    try {
      await deleteProjectMediaAsset(asset);
      const pid = selectedProjectId || projects[0]?.id || "default";
      const refreshed = await MediaRepository.listMediaAssets(pid);
      setMediaAssets(refreshed);
    } catch (error) {
      setStorageIssue(errorMessage(error));
    }
  }

  function handleMediaImport(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextEntries: MediaAsset[] = [];
    const names = mediaAssets.map((asset) => asset.name);

    files.forEach((file) => {
      const result = validateMediaAsset({
        name: file.name,
        size: file.size,
        type: file.type || inferMediaType(file.name),
      });

      if (!result.valid) {
        setStorageIssue(result.reason ?? "Unsupported file import.");
        return;
      }

      if (detectDuplicateAsset(names, file.name)) {
        setStorageIssue(`"${file.name}" is already in the media library.`);
        return;
      }

      const newAsset: MediaAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        type: result.type,
        size: formatBytes(file.size),
        importedAt: new Date().toISOString(),
      };
      nextEntries.push(newAsset);

      const pid = selectedProjectId || projects[0]?.id || "default";
      MediaRepository.addMediaAsset({ ...newAsset, projectId: pid }).catch(() => undefined);
    });

    setMediaAssets((current) => [...nextEntries, ...current]);
    if (nextEntries.length === 0) {
      setStorageState("error");
    }
    event.target.value = "";
  }

  async function generateStoryboardFromScript() {
    const scriptSource = scriptDocument ?? createScriptDocument({
      title: scriptTitle || "Storyboard draft",
      language: scriptLanguage,
      format: scriptFormat,
      content: buildScriptContent({
        title: scriptTitle || "Storyboard draft",
        topic: researchBrief?.topic || "your topic",
        language: scriptLanguage,
        format: scriptFormat,
      }),
    });

    const newStoryboard = convertScriptToStoryboard({
      title: scriptSource.title,
      format: scriptSource.format,
      content: scriptSource.content,
    });

    setStoryboard(newStoryboard);
    return newStoryboard;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="brand-copy">
            <strong>NovaVid AI Studio</strong>
            <span>LODHI TECHX Â· v0.1.0</span>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">LX</div>
          <div className="workspace-copy">
            <span>Workspace</span>
            <strong>LODHI TECHX Studio</strong>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <span className="nav-section-label">
            {uiLanguage === "ur" ? "ورک اسپیس" : "WORKSPACE"}
            <span style={{ fontSize: "0.65rem", opacity: 0.7, marginLeft: "6px", textTransform: "uppercase" }}>
              ({userMode})
            </span>
          </span>
          {filteredNavigation.map((item) => {
            const labelText = uiLanguage === "ur" ? (URDU_NAV_LABELS[item.label] || item.label) : item.label;
            return (
              <button
                className={`nav-item ${view === item.view ? "active" : ""}`}
                key={item.label}
                onClick={() => setView(item.view)}
                type="button"
              >
                <Icon name={item.icon} />
                <span>{labelText}</span>
                {item.view === "projects" && projects.length > 0 && (
                  <span className="nav-count">{projects.length}</span>
                )}
              </button>
            );
          })}

          <span className="nav-section-label tools-label">{uiLanguage === "ur" ? "تخلیقی ٹولز" : "CREATE"}</span>
          {plannedNavigation.map((item) => (
            <button
              className="nav-item planned"
              disabled
              key={item.label}
              title="Content planner module"
              type="button"
            >
              <Icon name={item.icon} />
              <span>{uiLanguage === "ur" ? "کنٹینٹ پلانر" : item.label}</span>
              <span className="planned-mark" aria-label="Planned">· · ·</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="phase-card">
            <div className="phase-card-icon"><Icon name="spark" /></div>
            <strong>Production Suite</strong>
            <p>Gemini AI, YouTube Data API v3 &amp; FFmpeg rendering engine active.</p>
            <small>LODHI TECHX Â· Release 0.1.0</small>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">LX</div>
            <div className="profile-copy">
              <strong>Local Studio</strong>
              <span>Encrypted DPAPI &amp; SQLite</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>{uiLanguage === "ur" ? "اسٹوڈیو" : "Studio"}</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* UI Mode Switcher */}
            <div className="mode-switcher-group" role="group" aria-label="Operating Mode">
              <button
                className={`mode-btn ${userMode === "beginner" ? "active" : ""}`}
                onClick={() => handleSetUserMode("beginner")}
                title="Beginner: Fast one-click autonomous video creation"
                type="button"
              >
                <span>🚀</span>
                <span>{uiLanguage === "ur" ? "مبتدی" : "Beginner"}</span>
              </button>
              <button
                className={`mode-btn ${userMode === "creator" ? "active" : ""}`}
                onClick={() => handleSetUserMode("creator")}
                title="Creator: Detailed script, storyboard, voiceover, and editing"
                type="button"
              >
                <span>🎨</span>
                <span>{uiLanguage === "ur" ? "تخلیق کار" : "Creator"}</span>
              </button>
              <button
                className={`mode-btn ${userMode === "advanced" ? "active" : ""}`}
                onClick={() => handleSetUserMode("advanced")}
                title="Advanced: Multi-AI models, cloud SaaS, licensing, and render controls"
                type="button"
              >
                <span>⚙</span>
                <span>{uiLanguage === "ur" ? "ایڈوانسڈ" : "Advanced"}</span>
              </button>
            </div>

            {/* 8GB RAM Resource Monitor Pill */}
            <button
              className={`resource-monitor-pill ${resourceMode === "low_resource" ? "low" : "warning"}`}
              onClick={handleCycleResourceMode}
              title={`RAM Protection: ${resourceMode.toUpperCase()}. Click to cycle modes (Low Resource / Balanced / Performance)`}
              type="button"
            >
              <span className="resource-dot"></span>
              <span>
                ⚡ {resourceMetrics ? `${(resourceMetrics.availablePhysicalRamMb / 1024).toFixed(1)}GB Free` : "Safe RAM"}
                {" "}({resourceMode === "low_resource" ? (uiLanguage === "ur" ? "۸ جی بی محفوظ" : "8GB Safe") : resourceMode})
              </span>
            </button>

            {/* Language Switcher */}
            <button
              className="lang-toggle-btn"
              onClick={handleToggleUiLanguage}
              title="Toggle Interface Language / اردو میں تبدیل کریں"
              type="button"
            >
              <span>🌐</span>
              <span>{uiLanguage === "ur" ? "English" : "اردو"}</span>
            </button>

            <button
              onClick={() => setIsShortcutsOpen(true)}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#cbd5e1",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Keyboard Shortcuts (? or Ctrl+/)"
              type="button"
            >
              ⌨ <span style={{ opacity: 0.8 }}>Hotkeys</span>
            </button>
            <button
              onClick={() => setIsFFmpegSetupOpen(true)}
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#94a3b8",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Manage or Install FFmpeg Engine"
            >
              <span>ðŸŽ¬</span> <span style={{ opacity: 0.9 }}>FFmpeg Engine</span>
            </button>
            <button
              onClick={() => setIsBetaFeedbackOpen(true)}
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#38bdf8",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Report Feedback or Performance Diagnostics"
            >
              <span>ðŸ’¬</span> <span style={{ opacity: 0.9 }}>Beta Feedback</span>
            </button>
            <div
              className={`storage-indicator ${storageState}`}
              role="status"
              title={
                storageState === "ready"
                  ? isTauriEnvironment()
                    ? "Projects are stored in the local SQLite database"
                    : "Projects are synchronized with Cloud Firestore (novavid-ecfc8)"
                  : "Connecting to project storage"
              }
            >
              <span className="status-dot" />
              {storageState === "ready"
                ? isTauriEnvironment()
                  ? "Local storage ready"
                  : "Cloud storage ready"
                : storageState === "connecting"
                  ? "Connecting"
                  : "Storage unavailable"}
            </div>
            <div className="topbar-avatar" aria-label="Local workspace">U</div>
          </div>
        </header>

        {storageIssue && (
          <div className="storage-alert" role="alert">
            <Icon name="warning" />
            <div>
              <strong>
                {storageState === "error"
                  ? "Could not connect to project storage"
                  : "Project operation failed"}
              </strong>
              <span>{storageIssue}</span>
              {storageState === "error" && (
                <span className="storage-hint">
                  {isTauriEnvironment()
                    ? "Check local SQLite database permissions."
                    : "Connecting to Cloud Firestore or local web cache. Please check your network connection."}
                </span>
              )}
            </div>
            {storageState === "error" && (
              <button
                className="alert-action"
                onClick={() => refreshProjects().catch(() => undefined)}
                type="button"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="page-content">
          {view === "dashboard" ? (
            <Dashboard
              completedCount={completedCount}
              draftCount={draftCount}
              onCreate={() => setModalProject(null)}
              onOpenProjects={() => setView("projects")}
              projects={projects}
              productionCount={productionCount}
              storageState={storageState}
              onSelectProject={(project) => {
                handleSelectProject(project.id);
                setView("scripts");
              }}
              resourceMetrics={resourceMetrics}
              resourceMode={resourceMode}
              isUrdu={uiLanguage === "ur"}
              onQuickProjectCreated={(project, autoLaunch) => {
                refreshProjects().catch(() => undefined);
                handleSelectProject(project.id);
                if (autoLaunch) {
                  setView("agent");
                } else {
                  setView("projects");
                }
              }}
            />
          ) : view === "agent" ? (
            <AgentStudioPage
              currentProjectId={selectedProjectId || projects[0]?.id || null}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              onNavigateToView={(target) => setView(target as View)}
            />
          ) : view === "projects" ? (
            <ProjectsPage
              filteredProjects={filteredProjects}
              onCreate={() => setModalProject(null)}
              onDelete={removeProject}
              onEdit={(project) => setModalProject(project)}
              onOpen={(projectId) => {
                handleSelectProject(projectId);
                setView("scripts");
              }}
              onSearch={setSearch}
              search={search}
              selectedProject={selectedProject}
              storageState={storageState}
            />
          ) : view === "media" ? (
            <MediaLibraryPage
              assets={mediaAssets}
              onImport={handleMediaImport}
              onNativeImport={handleNativeMediaImport}
              onDelete={handleDeleteMediaAsset}
            />
          ) : view === "providers" || view === "google_youtube" ? (
            <GoogleYouTubeConnectionCenter
              onNavigateToPublish={() => setView("publish")}
              onNavigateToResearch={() => setView("research")}
            />
          ) : view === "research" ? (
            <ResearchPage
              brief={researchBrief}
              language={researchLanguage}
              onGenerate={async () => {
                const adapter = new GeminiProviderAdapter(providerConfig);
                const result = await generateResearchFromProvider({
                  topic: researchTopic,
                  language: researchLanguage,
                  provider: adapter,
                });
                setResearchBrief(result);
                return result;
              }}
              onTopicChange={setResearchTopic}
              onLanguageChange={setResearchLanguage}
              topic={researchTopic}
            />
          ) : view === "scripts" ? (
            <ScriptStudioPage
              document={scriptDocument}
              formLanguage={scriptLanguage}
              formTitle={scriptTitle}
              format={scriptFormat}
              projects={projects}
              activeProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              onCreateProject={() => setModalProject(null)}
              onGenerate={async () => {
                let generatedContent: string;
                let usedModel: string | undefined;
                let fallbackUsed: boolean | undefined;
                let attemptsCount: number | undefined;
                let fallbackReasonText: string | undefined;

                if (providerConfig.credentialConfigured) {
                  try {
                    const prompt = `Write a comprehensive, highly engaging, professional YouTube script.
Title: ${scriptTitle || "Untitled script"}
Topic: ${researchBrief?.topic || scriptTitle || "How Artificial Intelligence Is Changing the World in 2026"}
Language: ${scriptLanguage}
Format: ${scriptFormat}

Please structure the script with the following sections:
# [Hook - First 10 Seconds]
(High-impact hook to immediately capture audience attention)

# [Introduction]
(Context, value proposition, and why this matters now)

# [Segment 1: The Core Foundation]
(Foundational technology and key principles)

# [Segment 2: Major Breakthroughs in 2026]
(Cutting-edge advancements, agentic workflows, and real-world impact)

# [Segment 3: The Human & Global Dimension]
(How creators, businesses, and society adapt to this shift)

# [Call to Action]
(Engaging call to like, comment, and subscribe to LODHI TECHX)

# [Outro]
(Memorable sign-off and next steps)`;

                    const adapter = new GeminiProviderAdapter(providerConfig);
                    const res = await adapter.generateTextDetailed(prompt, safeUUID(), true);
                    generatedContent = res.text;
                    usedModel = res.modelUsed;
                    fallbackUsed = res.fallbackOccurred;
                    attemptsCount = res.attempts;
                    fallbackReasonText = res.fallbackReason;
                  } catch (aiErr) {
                    console.warn("Gemini script generation fallback to template:", aiErr);
                    generatedContent = buildScriptContent({
                      title: scriptTitle || "Untitled script",
                      topic: researchBrief?.topic || scriptTitle || "your topic",
                      language: scriptLanguage,
                      format: scriptFormat,
                    });
                  }
                } else {
                  generatedContent = buildScriptContent({
                    title: scriptTitle || "Untitled script",
                    topic: researchBrief?.topic || scriptTitle || "your topic",
                    language: scriptLanguage,
                    format: scriptFormat,
                  });
                }

                const doc = createScriptDocument({
                  title: scriptTitle || "Untitled script",
                  language: scriptLanguage,
                  format: scriptFormat,
                  content: generatedContent,
                  modelUsed: usedModel,
                  fallbackOccurred: fallbackUsed,
                  attempts: attemptsCount,
                  fallbackReason: fallbackReasonText,
                });
                setScriptDocument(doc);
                if (selectedProjectId) {
                  await ScriptRepository.saveScript(selectedProjectId, doc).catch(console.error);
                }
                return doc;
              }}
              onRestore={(versionId) => {
                if (!scriptDocument) return;
                setScriptDocument(restoreScriptVersion(scriptDocument, versionId));
              }}
              onTitleChange={setScriptTitle}
              onFormatChange={setScriptFormat}
              onLanguageChange={setScriptLanguage}
              onUpdate={(nextContent) => {
                if (!scriptDocument) return;
                const updatedDoc = createScriptVersion(scriptDocument, nextContent);
                setScriptDocument(updatedDoc);
                if (selectedProjectId) {
                  ScriptRepository.saveScript(selectedProjectId, updatedDoc).catch(console.error);
                }
              }}
            />
          ) : view === "storyboard" ? (
            <StoryboardStudioPage
              assets={mediaAssets}
              imageConfig={imageGenerationConfig}
              onGenerate={generateStoryboardFromScript}
              onImageConfigChange={setImageGenerationConfig}
              onSceneDelete={(sceneId) => setStoryboard((current) => current ? removeScene(current, sceneId) : current)}
              onSceneDuplicate={(sceneId) => setStoryboard((current) => current ? duplicateScene(current, sceneId) : current)}
              onSceneMove={(sceneId, direction) => setStoryboard((current) => {
                if (!current) return current;
                const index = current.scenes.findIndex((scene) => scene.id === sceneId);
                if (index < 0) return current;
                const nextIndex = direction === "up" ? index - 1 : index + 1;
                if (nextIndex < 0 || nextIndex >= current.scenes.length) return current;
                return reorderScenes(current, sceneId, current.scenes[nextIndex].id);
              })}
              onSceneSplit={(sceneId) => setStoryboard((current) => current ? splitScene(current, sceneId) : current)}
              onSceneUpdate={(sceneId, changes) => setStoryboard((current) => current ? updateScene(current, sceneId, changes) : current)}
              onStyleProfileChange={setVisualStyleProfile}
              storyboard={storyboard}
              visualStyle={visualStyleProfile}
            />
          ) : view === "visuals" ? (
            <VisualStudioPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              storyboard={storyboard}
              onNavigateToTimeline={() => setView("timeline")}
            />
          ) : view === "voice" ? (
            <VoiceStudioPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              storyboard={storyboard}
              audioClips={audioClips}
              onAudioGenerated={async (clip) => {
                await AudioClipRepository.saveAudioClip(clip);
                setAudioClips((prev) => {
                  const filtered = prev.filter((c) => c.id !== clip.id && !(clip.sceneId && c.sceneId === clip.sceneId));
                  return [clip, ...filtered];
                });
              }}
              onAudioDeleted={async (clipId) => {
                await AudioClipRepository.deleteAudioClip(clipId);
                setAudioClips((prev) => prev.filter((c) => c.id !== clipId));
              }}
              onAudioApproved={async (clipId) => {
                await AudioClipRepository.approveAudioClip(clipId);
                setAudioClips((prev) =>
                  prev.map((c) => (c.id === clipId ? { ...c, status: "approved" as const } : c))
                );
              }}
              onError={(msg) => setStorageIssue(msg)}
            />
          ) : view === "subtitles" ? (
            <SubtitleStudioPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              storyboard={storyboard}
              audioClips={audioClips}
              subtitlesDoc={subtitlesDoc}
              onSaveSubtitles={async (doc) => {
                const pid = selectedProjectId || projects[0]?.id || "";
                if (pid) {
                  await SubtitleRepository.saveSubtitles(pid, doc);
                  setSubtitlesDoc(doc);
                }
              }}
              onError={(msg) => setStorageIssue(msg)}
            />
          ) : view === "audio" ? (
            <AudioStudioPage
              currentProjectId={selectedProjectId || projects[0]?.id || null}
              onNavigateToTimeline={() => setView("timeline")}
            />
          ) : view === "publish" ? (
            <PublishingStudioPage
              currentProjectId={selectedProjectId || projects[0]?.id || null}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              onNavigateToSEO={() => setView("seo")}
              onNavigateToConnectionCenter={() => setView("google_youtube")}
            />
          ) : view === "analytics" ? (
            <AnalyticsStudioPage
              currentProjectId={selectedProjectId || projects[0]?.id || null}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              onNavigateToPublish={() => setView("publish")}
              onNavigateToTimeline={() => setView("timeline")}
            />
          ) : view === "seo" ? (
            <SEOStudioPage
              currentProjectId={selectedProjectId || projects[0]?.id || null}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              storyboard={storyboard}
            />
          ) : view === "timeline" ? (
            <TimelineStudioPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              onNavigateToExport={() => setView("export")}
            />
          ) : view === "export" ? (
            <ExportManagerPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              onNavigateToTimeline={() => setView("timeline")}
            />
          ) : view === "creator" ? (
            <CreatorWorkspacePage
              onNavigateToStudio={(s) => setView(s as any)}
              onShowToast={(msg) => setQuickToast(msg)}
            />
          ) : view === "license" ? (
            <LicensingStudioPage />
          ) : view === "customer_saas" ? (
            <CustomerSaaSPanel />
          ) : view === "admin_saas" ? (
            <AdminSaaSPanel />
          ) : (
            <SettingsPage
              settings={studioSettings}
              onChange={(nextSettings) => setStudioSettings(normalizeStudioSettings(nextSettings))}
              onNavigateToConnectionCenter={() => setView("google_youtube")}
            />
          )}
        </div>
      </main>

      {modalProject !== undefined && (
        <ProjectDialog
          initialProject={modalProject}
          onClose={() => setModalProject(undefined)}
          onSave={(input) => saveProject(input, modalProject)}
        />
      )}

      <WorkstationShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <FFmpegSetupModal
        isOpen={isFFmpegSetupOpen}
        onClose={() => setIsFFmpegSetupOpen(false)}
      />

      <BetaFeedbackModal
        isOpen={isBetaFeedbackOpen}
        onClose={() => setIsBetaFeedbackOpen(false)}
        currentProjectId={selectedProjectId}
      />

      {quickToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#1e293b",
            border: "1px solid #3b82f6",
            color: "#60a5fa",
            padding: "10px 18px",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
            zIndex: 10000,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {quickToast}
        </div>
      )}
    </div>
  );
}

function StoryboardStudioPage({
  assets,
  imageConfig,
  onGenerate,
  onImageConfigChange,
  onSceneDelete,
  onSceneDuplicate,
  onSceneMove,
  onSceneSplit,
  onSceneUpdate,
  onStyleProfileChange,
  storyboard,
  visualStyle,
}: {
  assets: MediaAsset[];
  imageConfig: ImageGenerationConfig;
  onGenerate: () => Promise<StoryboardDocument>;
  onImageConfigChange: (next: ImageGenerationConfig) => void;
  onSceneDelete: (sceneId: string) => void;
  onSceneDuplicate: (sceneId: string) => void;
  onSceneMove: (sceneId: string, direction: "up" | "down") => void;
  onSceneSplit: (sceneId: string) => void;
  onSceneUpdate: (sceneId: string, changes: Partial<StoryboardScene>) => void;
  onStyleProfileChange: (profile: VisualStyleProfile) => void;
  storyboard: StoryboardDocument | null;
  visualStyle: VisualStyleProfile;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(storyboard?.scenes[0]?.id ?? null);
  const [generating, setGenerating] = useState(false);

  const selectedScene = storyboard?.scenes.find((scene) => scene.id === selectedSceneId) ?? storyboard?.scenes[0] ?? null;

  useEffect(() => {
    if (storyboard?.scenes[0] && !selectedSceneId) {
      setSelectedSceneId(storyboard.scenes[0].id);
    }
  }, [storyboard, selectedSceneId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await onGenerate();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> STORYBOARD STUDIO</div>
          <h1>Storyboard engine</h1>
          <p>Convert an approved script into a scene-by-scene production plan with visual and audio guidance.</p>
        </div>
        <button className="button button-primary" disabled={generating} onClick={handleGenerate} type="button">
          {generating ? "Generatingâ€¦" : "Generate storyboard"}
        </button>
      </section>

      <section className="panel storyboard-shell">
        <div className="storyboard-sidebar">
          <div className="storyboard-section-header">
            <strong>Scenes</strong>
            <span>{storyboard?.scenes.length ?? 0}</span>
          </div>

          {storyboard?.scenes.length ? (
            <div className="storyboard-scene-list">
              {storyboard.scenes.map((scene) => (
                <button
                  className={`scene-card ${selectedScene?.id === scene.id ? "selected" : ""}`}
                  key={scene.id}
                  onClick={() => setSelectedSceneId(scene.id)}
                  type="button"
                >
                  <div>
                    <span>Scene {scene.number}</span>
                    <strong>{scene.title}</strong>
                  </div>
                  <small>{scene.duration}s</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="research-empty compact">
              <p>No storyboard yet. Generate one from the current script or briefing.</p>
            </div>
          )}
        </div>

        <div className="storyboard-main">
          {selectedScene ? (
            <>
              <div className="storyboard-toolbar">
                <button className="button button-secondary" onClick={() => onSceneDuplicate(selectedScene.id)} type="button">Duplicate</button>
                <button className="button button-secondary" onClick={() => onSceneSplit(selectedScene.id)} type="button">Split</button>
                <button className="button button-secondary" onClick={() => onSceneMove(selectedScene.id, "up")} type="button">Move up</button>
                <button className="button button-secondary" onClick={() => onSceneMove(selectedScene.id, "down")} type="button">Move down</button>
                <button className="button button-quiet" onClick={() => onSceneDelete(selectedScene.id)} type="button">Delete</button>
              </div>

              <div className="storyboard-fields">
                <label className="settings-field">
                  <span>Scene title</span>
                  <input
                    onChange={(event) => onSceneUpdate(selectedScene.id, { title: event.currentTarget.value })}
                    value={selectedScene.title}
                  />
                </label>
                <label className="settings-field">
                  <span>Duration (seconds)</span>
                  <input
                    onChange={(event) => onSceneUpdate(selectedScene.id, { duration: Number(event.currentTarget.value) || 5 })}
                    type="number"
                    value={selectedScene.duration}
                  />
                </label>
                <label className="settings-field">
                  <span>Status</span>
                  <select
                    onChange={(event) => onSceneUpdate(selectedScene.id, { status: event.currentTarget.value as StoryboardScene["status"] })}
                    value={selectedScene.status}
                  >
                    <option value="pending">Pending</option>
                    <option value="generated">Generated</option>
                    <option value="imported">Imported</option>
                    <option value="approved">Approved</option>
                  </select>
                </label>
                <label className="settings-field">
                  <span>Camera motion</span>
                  <input
                    onChange={(event) => onSceneUpdate(selectedScene.id, { cameraMotion: event.currentTarget.value })}
                    value={selectedScene.cameraMotion}
                  />
                </label>
                <label className="settings-field">
                  <span>Transition</span>
                  <input
                    onChange={(event) => onSceneUpdate(selectedScene.id, { transition: event.currentTarget.value })}
                    value={selectedScene.transition}
                  />
                </label>
                <label className="settings-field">
                  <span>Audio suggestion</span>
                  <input
                    onChange={(event) => onSceneUpdate(selectedScene.id, { audioSuggestion: event.currentTarget.value })}
                    value={selectedScene.audioSuggestion}
                  />
                </label>
                <label className="settings-field full-span">
                  <span>Script narration</span>
                  <textarea
                    onChange={(event) => onSceneUpdate(selectedScene.id, { narration: event.currentTarget.value })}
                    rows={4}
                    value={selectedScene.narration}
                  />
                </label>
                <label className="settings-field full-span">
                  <span>Visual description</span>
                  <textarea
                    onChange={(event) => onSceneUpdate(selectedScene.id, { visualDescription: event.currentTarget.value })}
                    rows={3}
                    value={selectedScene.visualDescription}
                  />
                </label>
                <label className="settings-field full-span">
                  <span>Image prompt</span>
                  <textarea
                    onChange={(event) => onSceneUpdate(selectedScene.id, { visualPrompt: event.currentTarget.value })}
                    rows={3}
                    value={selectedScene.visualPrompt}
                  />
                </label>
                <label className="settings-field full-span">
                  <span>Assigned asset</span>
                  <select
                    onChange={(event) => onSceneUpdate(selectedScene.id, { assetId: event.currentTarget.value || null })}
                    value={selectedScene.assetId ?? ""}
                  >
                    <option value="">No asset assigned</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          ) : (
            <div className="research-empty">
              <p>Select a scene to edit it.</p>
            </div>
          )}
        </div>

        <aside className="storyboard-side-panel">
          <div className="panel compact-panel">
            <h3>Visual style</h3>
            <label className="settings-field">
              <span>Art style</span>
              <input
                onChange={(event) => onStyleProfileChange({ ...visualStyle, artStyle: event.currentTarget.value })}
                value={visualStyle.artStyle}
              />
            </label>
            <label className="settings-field">
              <span>Lighting</span>
              <input
                onChange={(event) => onStyleProfileChange({ ...visualStyle, lighting: event.currentTarget.value })}
                value={visualStyle.lighting}
              />
            </label>
            <label className="settings-field">
              <span>Color palette</span>
              <input
                onChange={(event) => onStyleProfileChange({ ...visualStyle, colorPalette: event.currentTarget.value.split(",").map((part) => part.trim()).filter(Boolean) })}
                value={visualStyle.colorPalette.join(", ")}
              />
            </label>
          </div>

          <div className="panel compact-panel">
            <h3>Image generation</h3>
            <label className="settings-field">
              <span>Model</span>
              <input
                onChange={(event) => onImageConfigChange({ ...imageConfig, model: event.currentTarget.value })}
                value={imageConfig.model}
              />
            </label>
            <p className="provider-result">
              {validateImageGenerationConfig(imageConfig).status === "available" ? "Image generation is available for the selected model." : "Image generation is unavailable in this build. No image credential is stored here."}
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

interface DashboardProps {
  completedCount: number;
  draftCount: number;
  onCreate: () => void;
  onOpenProjects: () => void;
  onSelectProject: (project: Project) => void;
  projects: Project[];
  productionCount: number;
  storageState: StorageState;
  resourceMetrics: SystemResourceMetrics | null;
  resourceMode: ResourceMode;
  isUrdu: boolean;
  onQuickProjectCreated: (project: Project, autoLaunch: boolean) => void;
}

function Dashboard({
  completedCount,
  draftCount,
  onCreate,
  onOpenProjects,
  onSelectProject,
  projects,
  productionCount,
  storageState,
  resourceMetrics,
  resourceMode,
  isUrdu,
  onQuickProjectCreated,
}: DashboardProps) {
  const canReadProjects = storageState === "ready";
  const recentProjects = projects.slice(0, 4);

  return (
    <>
      {/* Phase 2: One-Topic-To-Finished-Video Fast Creator */}
      <OneClickVideoCreator
        onProjectCreated={onQuickProjectCreated}
        resourceMetrics={resourceMetrics}
        resourceMode={resourceMode}
        isUrdu={isUrdu}
      />

      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {isUrdu ? "آپ کا تخلیقی ورک اسپیس" : "YOUR CREATOR WORKSPACE"}</div>
          <h1>{isUrdu ? "اپنے اگلے بڑے آئیڈیا کو حقیقت بنائیں" : "Make room for your next big idea."}</h1>
          <p>{isUrdu ? "ایک پروجیکٹ منتخب کریں یا اوپر عنوان دے کر چند منٹوں میں مکمل ویڈیو تیار کریں۔" : "Start with a project. Build your video one thoughtful step at a time."}</p>
        </div>
        <button className="button button-primary" disabled={!canReadProjects} onClick={onCreate} type="button">
          <Icon name="plus" />
          {isUrdu ? "نیا پروجیکٹ مسودہ" : "New project"}
        </button>
      </section>

      <section className="metrics-grid" aria-label="Project overview">
        <MetricCard
          accent="violet"
          icon="folder"
          label="Total projects"
          value={metricValue(storageState, projects.length)}
          detail="In your workspace"
        />
        <MetricCard
          accent="blue"
          icon="clock"
          label="In production"
          value={metricValue(storageState, productionCount)}
          detail="Active projects"
        />
        <MetricCard
          accent="amber"
          icon="script"
          label="Drafts"
          value={metricValue(storageState, draftCount)}
          detail="Ready to pick up"
        />
        <MetricCard
          accent="green"
          icon="check"
          label="Completed"
          value={metricValue(storageState, completedCount)}
          detail="Finished projects"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent projects</h2>
              <p>Pick up where you left off.</p>
            </div>
            <button className="text-button" onClick={onOpenProjects} type="button">
              All projects <Icon name="arrowRight" />
            </button>
          </div>
          {storageState === "connecting" ? (
            <div className="inline-loading">
              <span className="spinner" />
              <span>Connecting to your local workspaceâ€¦</span>
            </div>
          ) : storageState === "error" ? (
            <div className="projects-unavailable">
              <Icon name="warning" />
              <span>Connect the desktop app to view local projects.</span>
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="empty-projects">
              <div className="empty-illustration">
                <div className="empty-paper"><span /><span /><span /></div>
                <div className="empty-sparkle sparkle-one">âœ³</div>
                <div className="empty-sparkle sparkle-two">âœ¦</div>
              </div>
              <h3>Your next video starts here</h3>
              <p>Create a project to keep your topic, script, scenes, and assets together.</p>
              <button className="button button-secondary" onClick={onCreate} type="button">
                <Icon name="plus" />
                Create your first project
              </button>
            </div>
          ) : (
            <div className="recent-list">
              {recentProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  onOpen={() => onSelectProject(project)}
                  project={project}
                />
              ))}
            </div>
          )}
        </div>

        <div className="panel getting-started-panel">
          <div className="panel-heading">
            <div>
              <h2>Your production flow</h2>
              <p>A clear path from idea to upload.</p>
            </div>
            <span className="flow-badge">THE WORKFLOW</span>
          </div>
          <div className="flow-list">
            <FlowStep number="01" title="Start with a topic" description="Capture the idea and audience." state="current" />
            <FlowStep number="02" title="Research & write" description="Turn your idea into a script." />
            <FlowStep number="03" title="Build your video" description="Create scenes, voice, and visuals." />
            <FlowStep number="04" title="Review & publish" description="Approve your cut before upload." />
          </div>
          <div className="flow-note">
            <Icon name="lock" />
            <span>DPAPI-secured credentials, local SQLite project persistence, and YouTube Data API v3 publishing.</span>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <span>NovaVid AI YouTube Studio <span className="footer-dot">Â·</span> LODHI TECHX v0.1.0 Commercial Production Suite</span>
        <span>Empowering autonomous AI video production with Google Gemini &amp; FFmpeg</span>
      </footer>
    </>
  );
}

function MetricCard({
  accent,
  detail,
  icon,
  label,
  value,
}: {
  accent: string;
  detail: string;
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${accent}`}><Icon name={icon} /></div>
      <div className="metric-copy">
        <span className="metric-label">{label}</span>
        <strong className="metric-value">{value}</strong>
        <span className="metric-detail">{detail}</span>
      </div>
      <span className="metric-decoration" />
    </article>
  );
}

function SettingsPage({
  onChange,
  settings,
  onNavigateToConnectionCenter,
}: {
  onChange: (next: StudioSettings) => void;
  settings: StudioSettings;
  onNavigateToConnectionCenter?: () => void;
}) {
  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE SETTINGS</div>
          <h1>Studio defaults</h1>
          <p>Keep local defaults consistent across your next video projects.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {onNavigateToConnectionCenter && (
            <button className="button button-primary" onClick={onNavigateToConnectionCenter} type="button">
              ðŸŒ Google & YouTube Center
            </button>
          )}
          <button className="button button-secondary" onClick={() => onChange(DEFAULT_SETTINGS)} type="button">
            Reset defaults
          </button>
        </div>
      </section>

      <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "12px", background: "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(220,38,38,0.15))", border: "1px solid rgba(14,165,233,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 4px", color: "#ffffff", fontSize: "1rem", fontWeight: 700 }}>Google & YouTube Connection Center</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Manage separate accounts for Gemini AI (existing paid account) and YouTube Publishing (LODHI TECHX).</p>
        </div>
        {onNavigateToConnectionCenter && (
          <button className="button button-primary" onClick={onNavigateToConnectionCenter} type="button">
            Open Connection Center â†—
          </button>
        )}
      </div>

      <section className="panel settings-panel">
        <div className="settings-grid">
          <label className="settings-field">
            <span>Default language</span>
            <select
              onChange={(event) =>
                onChange({ ...settings, defaultLanguage: event.currentTarget.value as ProjectLanguage })
              }
              value={settings.defaultLanguage}
            >
              {PROJECT_LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Content category</span>
            <select
              onChange={(event) =>
                onChange({ ...settings, contentCategory: event.currentTarget.value as StudioSettings["contentCategory"] })
              }
              value={settings.contentCategory}
            >
              {PROJECT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Default export format</span>
            <select
              onChange={(event) =>
                onChange({ ...settings, defaultFormat: event.currentTarget.value as StudioSettings["defaultFormat"] })
              }
              value={settings.defaultFormat}
            >
              {PROJECT_FORMATS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Theme</span>
            <select
              onChange={(event) =>
                onChange({ ...settings, theme: event.currentTarget.value as StudioSettings["theme"] })
              }
              value={settings.theme}
            >
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="settings-toggle-row">
          <div>
            <strong>Local-only workspace</strong>
            <span>Keep project and media data on this device unless you explicitly connect a provider.</span>
          </div>
          <button
            className={`toggle ${settings.localOnlyMode ? "on" : ""}`}
            onClick={() => onChange({ ...settings, localOnlyMode: !settings.localOnlyMode })}
            type="button"
            aria-pressed={settings.localOnlyMode}
          >
            <span />
          </button>
        </div>
      </section>
    </>
  );
}

function MediaLibraryPage({
  assets,
  onImport,
  onNativeImport,
  onDelete,
}: {
  assets: MediaAsset[];
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onNativeImport?: () => void;
  onDelete?: (asset: MediaAsset) => void;
}) {
  const isTauri = isTauriEnvironment();

  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> ASSET LIBRARY</div>
          <h1>Media library</h1>
          <p>Organize imported images, audio, and videos before they reach the production timeline.</p>
        </div>
        {isTauri && onNativeImport ? (
          <button type="button" className="button button-primary" onClick={onNativeImport}>
            <Icon name="plus" />
            Import media
          </button>
        ) : (
          <label className="button button-primary file-upload-label" htmlFor="media-upload">
            <Icon name="plus" />
            Import media
          </label>
        )}
        <input id="media-upload" hidden multiple onChange={onImport} type="file" accept="image/*,video/*,audio/*" />
      </section>

      <section className="panel media-panel">
        {assets.length === 0 ? (
          <div className="projects-empty-state">
            <div className="empty-state-icon"><Icon name="media" /></div>
            <h3>No media imported yet</h3>
            <p>Add your first image, audio clip, or video file to start building your production assets.</p>
            {isTauri && onNativeImport ? (
              <button type="button" className="button button-secondary" onClick={onNativeImport}>
                <Icon name="plus" />
                Add the first asset
              </button>
            ) : (
              <label className="button button-secondary" htmlFor="media-upload">
                <Icon name="plus" />
                Add the first asset
              </label>
            )}
          </div>
        ) : (
          <div className="media-grid">
            {assets.map((asset) => (
              <article className="media-card" key={asset.id}>
                <div className={`media-preview ${asset.type}`}>
                  <Icon name={asset.type === "image" ? "media" : asset.type === "video" ? "video" : asset.type === "audio" ? "clock" : "folder"} />
                </div>
                <div className="media-copy">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{asset.name}</strong>
                    {onDelete && (
                      <button
                        type="button"
                        aria-label={`Delete ${asset.name}`}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-danger, #ef4444)" }}
                        onClick={() => onDelete(asset)}
                      >
                        <Icon name="trash" />
                      </button>
                    )}
                  </div>
                  <span>
                    {asset.type} Â· {asset.size}
                    {asset.width && asset.height ? ` Â· ${asset.width}Ã—${asset.height}` : ""}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
                    <small>{formatDate(asset.importedAt)}</small>
                    {asset.missing && (
                      <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>Missing file</span>
                    )}
                    {asset.checksum && (
                      <span style={{ fontSize: "0.75rem", color: "#10b981", opacity: 0.8 }} title={`SHA-256: ${asset.checksum}`}>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function ProvidersPage({
  config,
  onChange,
  onRemoveCredential,
  onSaveCredential,
  onTest,
}: {
  config: ProviderConfig;
  onChange: (next: ProviderConfig) => void;
  onRemoveCredential: () => Promise<void>;
  onSaveCredential: (credential: string) => Promise<void>;
  onTest: (billingConfirmed: boolean) => Promise<{ connected: boolean; status: string; message: string }>;
}) {
  const [testing, setTesting] = useState(false);
  const [savingCredential, setSavingCredential] = useState(false);
  const [credentialDraft, setCredentialDraft] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleTest() {
    if (!window.confirm("This sends a request to the Gemini API. API billing may apply and is separate from Google AI Pro. Continue?")) return;
    setTesting(true);
    try {
      const result = await onTest(true);
      setTestResult(result.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveCredential() {
    setSavingCredential(true);
    try {
      await onSaveCredential(credentialDraft);
      setCredentialDraft("");
      setTestResult("Credential saved to Windows Credential Manager. It cannot be read back by this app.");
    } catch (error) {
      setTestResult(errorMessage(error));
    } finally {
      setSavingCredential(false);
    }
  }

  async function handleRemoveCredential() {
    try {
      await onRemoveCredential();
      setTestResult("Gemini credential removed from Windows Credential Manager.");
    } catch (error) {
      setTestResult(errorMessage(error));
    }
  }

  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> PROVIDER SETTINGS</div>
          <h1>AI Providers</h1>
          <p>Google Gemini is the primary provider for phase 2. Claude remains available as a future-compatible adapter.</p>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="provider-summary">
          <div>
            <span className="provider-label">Primary provider</span>
            <strong>Google Gemini</strong>
          </div>
          <span className={`status-pill ${config.status === "connected" ? "completed" : config.status === "error" ? "in_progress" : ""}`}>
            <span />{config.status === "connected" ? "Connected" : config.status === "error" ? "Needs attention" : "Disconnected"}
          </span>
        </div>

        <div className="voice-cost-banner" style={{ marginBottom: "16px" }}>
          <strong>Gemini API vs Consumer Subscription:</strong> Google Gemini Developer API usage is billed by tokens / requests through your Google Cloud / Google AI Studio project. Consumer subscriptions (such as Gemini Advanced or Google One AI Premium) do not provide unlimited developer API requests. Explicit billing confirmation is strictly enforced before any paid request.
        </div>
        <div className="settings-grid provider-grid">
          <label className="settings-field">
            <span>Provider</span>
            <select
              disabled
              value={config.provider}
            >
              <option value="gemini">Google Gemini</option>
              <option value="claude">Claude</option>
            </select>
          </label>

          <label className="settings-field">
            <span>Model</span>
            <select
              onChange={(event) =>
                onChange({ ...config, model: event.currentTarget.value })
              }
              value={config.model}
            >
              {FALLBACK_GEMINI_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.status.toUpperCase()}{m.supportsTts ? " Â· Text and Audio" : " Â· Text Only"})
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field provider-key-field">
            <span>Gemini API key</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setCredentialDraft(event.currentTarget.value)}
              placeholder="Enter a key to save or replace"
              type="password"
              value={credentialDraft}
            />
          </label>

          <div className="settings-field provider-meta">
            <span>Usage status</span>
            <strong>{config.usage.requests} requests Â· {config.usage.estimatedCost}</strong>
            <small>{config.credentialConfigured ? "Credential stored securely in Windows Credential Manager" : "No credential configured"}</small>
            <small>{config.usage.lastUsed ? `Last used ${formatDate(config.usage.lastUsed)}` : "No usage yet"}</small>
          </div>
        </div>

        <div className="button-row">
          <button className="button button-primary" disabled={savingCredential || !credentialDraft.trim()} onClick={handleSaveCredential} type="button">
            {savingCredential ? "Savingâ€¦" : config.credentialConfigured ? "Replace credential" : "Save credential securely"}
          </button>
          {config.credentialConfigured && (
            <button className="button button-secondary" onClick={handleRemoveCredential} type="button">Remove credential</button>
          )}
        </div>

        <div className="provider-actions">
          <label className="toggle-wrap">
            <span>Enable provider</span>
            <button
              aria-pressed={config.enabled}
              className={`toggle ${config.enabled ? "on" : ""}`}
              disabled={!config.credentialConfigured}
              onClick={() => onChange({ ...config, enabled: !config.enabled })}
              type="button"
            >
              <span />
            </button>
          </label>

          <div className="button-row">
            <button className="button button-secondary" onClick={() => onChange({ ...DEFAULT_PROVIDER_CONFIG, model: config.model, credentialConfigured: config.credentialConfigured })} type="button">
              Reset
            </button>
            <button className="button button-primary" disabled={testing} onClick={handleTest} type="button">
              {testing ? "Testingâ€¦" : "Test connection"}
            </button>
          </div>
        </div>

        {testResult && <p className="provider-result">{testResult}</p>}

        <div className="provider-note">
          <strong>Important:</strong>
          <span>Google AI Pro subscription access is separate from Gemini API billing. Each connection or generation request requires explicit confirmation.</span>
        </div>
      </section>
    </>
  );
}

function ResearchPage({
  brief,
  language,
  onGenerate,
  onLanguageChange,
  onTopicChange,
  topic,
}: {
  brief: ResearchBrief | null;
  language: ProjectLanguage;
  onGenerate: () => Promise<ResearchBrief>;
  onLanguageChange: (value: ProjectLanguage) => void;
  onTopicChange: (value: string) => void;
  topic: string;
}) {
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);

  async function handleGenerate() {
    if (!window.confirm("This sends your topic to Google Gemini. API billing may apply and is separate from Google AI Pro. Continue?")) return;
    setLoading(true);
    setIssue(null);
    try {
      await onGenerate();
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> RESEARCH STUDIO</div>
          <h1>AI research</h1>
          <p>Generate a structured brief for a YouTube topic without inventing trends or statistics.</p>
        </div>
      </section>

      <section className="panel research-panel">
        <div className="research-form">
          <label className="settings-field">
            <span>Topic</span>
            <textarea
              onChange={(event) => onTopicChange(event.currentTarget.value)}
              placeholder="e.g. AI tools for creators"
              rows={3}
              value={topic}
            />
          </label>

          <label className="settings-field">
            <span>Language</span>
            <select onChange={(event) => onLanguageChange(event.currentTarget.value as ProjectLanguage)} value={language}>
              {PROJECT_LANGUAGES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button className="button button-primary" disabled={loading || !topic.trim()} onClick={handleGenerate} type="button">
              {loading ? "Researchingâ€¦" : "Generate research"}
            </button>
          </div>
        </div>

        {issue && <p className="provider-result error">{issue}</p>}

        {brief ? (
          <div className="research-result">
            <div className="brief-header">
              <div>
                <span className="provider-label">Topic</span>
                <strong>{brief.topic}</strong>
              </div>
              <span className="provider-label">{brief.providerName}</span>
            </div>

            <div className="brief-block">
              <h3>Research questions</h3>
              <ul>{brief.questions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="brief-block">
              <h3>Outline</h3>
              <ul>{brief.outline.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="brief-block">
              <h3>Key points</h3>
              <ul>{brief.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="brief-block">
              <h3>Video structure</h3>
              <ul>{brief.structure.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="brief-block">
              <h3>Verified facts</h3>
              <ul>{brief.verifiedFacts.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="brief-block">
              <h3>Assumptions</h3>
              <ul>{brief.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="brief-block warning-box">
              <h3>Limitations</h3>
              <p>{brief.limitations}</p>
            </div>
          </div>
        ) : (
          <div className="research-empty">
            <Icon name="search" />
            <p>No research brief yet. Generate one from a topic to start your production plan.</p>
          </div>
        )}
      </section>
    </>
  );
}

function ScriptStudioPage({
  document,
  formLanguage,
  formTitle,
  format,
  onGenerate,
  onLanguageChange,
  onFormatChange,
  onRestore,
  onTitleChange,
  onUpdate,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
}: {
  document: ScriptDocument | null;
  formLanguage: ProjectLanguage;
  formTitle: string;
  format: ScriptFormat;
  onGenerate: () => Promise<ScriptDocument>;
  onLanguageChange: (value: ProjectLanguage) => void;
  onFormatChange: (value: ScriptFormat) => void;
  onRestore: (versionId: string) => void;
  onTitleChange: (value: string) => void;
  onUpdate: (content: string) => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> SCRIPT STUDIO</div>
          <h1>Script generation</h1>
          <p>Create script drafts, edit them, and restore prior versions without losing the current flow.</p>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-muted)" }}>Active Project:</span>
          {projects.length > 0 ? (
            <select
              value={activeProjectId || ""}
              onChange={(event) => onSelectProject(event.currentTarget.value)}
              style={{
                minWidth: "260px",
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                background: "var(--color-surface-elevated, #1e293b)",
                border: "1px solid var(--color-border, #334155)",
                color: "var(--color-text, #f8fafc)",
                fontSize: "0.9rem",
              }}
            >
              <option value="" disabled>-- Select a project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.language})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: "var(--color-warning, #f59e0b)", fontSize: "0.875rem" }}>No projects created yet.</span>
          )}
        </div>
        <button
          className="button button-secondary"
          onClick={onCreateProject}
          type="button"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <Icon name="plus" /> New project
        </button>
      </section>

      <section className="panel script-panel">
        <div className="script-controls">
          <label className="settings-field">
            <span>Script title</span>
            <input onChange={(event) => onTitleChange(event.currentTarget.value)} value={formTitle} />
          </label>

          <label className="settings-field">
            <span>Language</span>
            <select onChange={(event) => onLanguageChange(event.currentTarget.value as ProjectLanguage)} value={formLanguage}>
              {PROJECT_LANGUAGES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Format</span>
            <select onChange={(event) => onFormatChange(event.currentTarget.value as ScriptFormat)} value={format}>
              <option value="Long-form">Long-form</option>
              <option value="YouTube Shorts">YouTube Shorts</option>
              <option value="Educational explainer">Educational explainer</option>
            </select>
          </label>

          <div className="button-row">
            <button className="button button-primary" disabled={loading} onClick={handleGenerate} type="button">
              {loading ? "Generatingâ€¦" : "Generate script"}
            </button>
          </div>
        </div>

        {document ? (
          <>
            <textarea
              className="script-editor"
              onChange={(event) => onUpdate(event.currentTarget.value)}
              value={document.content}
            />

            <div className="version-list">
              <h3>Version history</h3>
              {document.versions.map((version) => (
                <button className="version-item" key={version.id} onClick={() => onRestore(version.id)} type="button">
                  <span>{version.label}</span>
                  <small>{formatDate(version.createdAt)}</small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="research-empty">
            <Icon name="script" />
            <p>No script yet. Generate one to create the first draft and version history.</p>
          </div>
        )}
      </section>
    </>
  );
}

function ProjectsPage({
  filteredProjects,
  onCreate,
  onDelete,
  onEdit,
  onOpen,
  onSearch,
  search,
  selectedProject,
  storageState,
}: {
  filteredProjects: Project[];
  onCreate: () => void;
  onDelete: (project: Project) => void;
  onEdit: (project: Project) => void;
  onOpen: (projectId: string) => void;
  onSearch: (value: string) => void;
  search: string;
  selectedProject?: Project;
  storageState: StorageState;
}) {
  return (
    <>
      <section className="page-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR WORKSPACE</div>
          <h1>Projects</h1>
          <p>Keep every video idea organized from the first note to the final cut.</p>
        </div>
        <button
          className="button button-primary"
          disabled={storageState !== "ready"}
          onClick={onCreate}
          type="button"
        >
          <Icon name="plus" />
          New project
        </button>
      </section>

      <section className="projects-layout">
        <div className="panel projects-panel">
          <div className="project-toolbar">
            <div>
              <h2>All projects</h2>
              <span className="project-total">
                {storageState === "ready" ? `${filteredProjects.length} projects` : "Database unavailable"}
              </span>
            </div>
            <label className="search-field">
              <Icon name="search" />
              <input
                aria-label="Search projects"
                onChange={(event) => onSearch(event.currentTarget.value)}
                placeholder="Search projects"
                value={search}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => onSearch("")} type="button">
                  <Icon name="close" />
                </button>
              )}
            </label>
          </div>

          {storageState === "connecting" ? (
            <div className="projects-empty-state">
              <span className="spinner" />
              <h3>Loading projects</h3>
              <p>Connecting to your local database.</p>
            </div>
          ) : storageState === "error" ? (
            <div className="projects-empty-state">
              <div className="empty-state-icon warning-icon"><Icon name="warning" /></div>
              <h3>Projects arenâ€™t available right now</h3>
              <p>Connect to the desktop app to view and manage your local projects.</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="projects-empty-state">
              <div className="empty-state-icon"><Icon name={search ? "search" : "folder"} /></div>
              <h3>{search ? "No matching projects" : "No projects yet"}</h3>
              <p>
                {search
                  ? "Try another search term or clear your search."
                  : "Create a project to give your next video a home."}
              </p>
              {!search && (
                <button className="button button-secondary" onClick={onCreate} type="button">
                  <Icon name="plus" />
                  Create project
                </button>
              )}
            </div>
          ) : (
            <div className="project-list">
              {filteredProjects.map((project) => (
                <ProjectRow
                  active={selectedProject?.id === project.id}
                  key={project.id}
                  onOpen={() => onOpen(project.id)}
                  onDelete={() => onDelete(project)}
                  onEdit={() => onEdit(project)}
                  project={project}
                  showActions
                />
              ))}
            </div>
          )}
        </div>

        <aside className="panel project-details">
          {selectedProject ? (
            <>
              <div className="details-heading">
                <div className="detail-project-icon"><Icon name="clapper" /></div>
                <span className={`status-pill ${selectedProject.status}`}>
                  <span />{statusLabel(selectedProject.status)}
                </span>
              </div>
              <span className="details-kicker">PROJECT DETAILS</span>
              <h2>{selectedProject.name}</h2>
              <p className="details-topic">{selectedProject.topic}</p>
              <div className="detail-divider" />
              <DetailItem label="Language" value={selectedProject.language} />
              <DetailItem label="Created" value={formatDate(selectedProject.created_at)} />
              <DetailItem label="Last updated" value={formatDate(selectedProject.updated_at)} />
              <div className="details-note">
                <Icon name="info" />
                <p>Your project is safely stored in the local SQLite database. Production tools will be unlocked in upcoming phases.</p>
              </div>
              <button className="button button-secondary details-edit" onClick={() => onEdit(selectedProject)} type="button">
                <Icon name="edit" />
                Edit project
              </button>
            </>
          ) : (
            <div className="details-placeholder">
              <div className="details-placeholder-icon"><Icon name="cursor" /></div>
              <h3>Select a project</h3>
              <p>Choose a project from your list to see its details and continue organizing your idea.</p>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function ProjectRow({
  active = false,
  onDelete,
  onEdit,
  onOpen,
  project,
  showActions = false,
}: {
  active?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onOpen: () => void;
  project: Project;
  showActions?: boolean;
}) {
  return (
    <article className={`project-row ${active ? "selected" : ""}`}>
      <button className="project-row-main" onClick={onOpen} type="button">
        <div className="project-cover"><Icon name="clapper" /></div>
        <div className="project-row-copy">
          <strong>{project.name}</strong>
          <span>{project.topic}</span>
        </div>
        <span className={`status-pill ${project.status}`}>
          <span />{statusLabel(project.status)}
        </span>
        <span className="project-date">{formatDate(project.updated_at)}</span>
      </button>
      {showActions && (
        <div className="project-row-actions">
          <button aria-label={`Edit ${project.name}`} onClick={onEdit} type="button"><Icon name="edit" /></button>
          <button aria-label={`Delete ${project.name}`} onClick={onDelete} type="button"><Icon name="trash" /></button>
        </div>
      )}
    </article>
  );
}

function ProjectDialog({
  initialProject,
  onClose,
  onSave,
}: {
  initialProject: Project | null;
  onClose: () => void;
  onSave: (input: ProjectInput) => Promise<void>;
}) {
  const [name, setName] = useState(initialProject?.name ?? "");
  const [topic, setTopic] = useState(initialProject?.topic ?? "");
  const [language, setLanguage] = useState<ProjectLanguage>(
    initialProject?.language ?? "English",
  );
  const [formIssue, setFormIssue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormIssue(null);
    setSaving(true);
    try {
      await onSave({ name, topic, language });
      onClose();
    } catch (error) {
      setFormIssue(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section aria-labelledby="project-dialog-title" aria-modal="true" className="project-dialog" role="dialog">
        <div className="dialog-heading">
          <div className="dialog-icon"><Icon name={initialProject ? "edit" : "clapper"} /></div>
          <button aria-label="Close dialog" className="dialog-close" disabled={saving} onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </div>
        <h2 id="project-dialog-title">{initialProject ? "Edit project" : "Create a project"}</h2>
        <p className="dialog-description">
          {initialProject
            ? "Update the details for this video project."
            : "Give your video idea a name and a topic to get started."}
        </p>
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Project name <em>*</em></span>
            <input
              autoFocus
              maxLength={100}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="e.g. AI tools for everyday creators"
              required
              value={name}
            />
          </label>
          <label className="form-field">
            <span>Video topic <em>*</em></span>
            <textarea
              maxLength={500}
              onChange={(event) => setTopic(event.currentTarget.value)}
              placeholder="What would you like this video to be about?"
              required
              rows={3}
              value={topic}
            />
          </label>
          <label className="form-field">
            <span>Primary language</span>
            <select
              onChange={(event) => setLanguage(event.currentTarget.value as ProjectLanguage)}
              value={language}
            >
              {PROJECT_LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {formIssue && <p className="form-error" role="alert">{formIssue}</p>}
          <div className="dialog-footer">
            <span><Icon name="lock" /> Saved locally on this device</span>
            <div>
              <button className="button button-quiet" disabled={saving} onClick={onClose} type="button">Cancel</button>
              <button className="button button-primary" disabled={saving} type="submit">
                {saving ? <span className="button-spinner" /> : <Icon name="check" />}
                {saving ? "Savingâ€¦" : initialProject ? "Save changes" : "Create project"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlowStep({
  description,
  number,
  state,
  title,
}: {
  description: string;
  number: string;
  state?: "current";
  title: string;
}) {
  return (
    <div className={`flow-step ${state ?? ""}`}>
      <span className="flow-number">{number}</span>
      <div className="flow-step-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      {state === "current" ? <span className="flow-current">YOU ARE HERE</span> : <Icon name="lock" />}
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
  const paths: Record<string, ReactNode> = {
    arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2m4 0h2m-8 4h2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clapper: <><path d="M4 8.5h16v11H4z" /><path d="m4 8.5 1.7-5 4.5 1.5-1.6 5m1.6-5 4.5 1.5-1.6 5m1.6-5 4.5 1.5-1.6 5" /><path d="M8 13h.01M12 13h.01M16 13h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    cursor: <><path d="m5 3 14 9-7 1-3 7L5 3Z" /><path d="m12 13 4 6" /></>,
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z" /><path d="m13.5 7 3.5 3.5" /></>,
    folder: <><path d="M3 7.5h7l2 2H21v9.7a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2V7.5Z" /><path d="M3 9.5V5.8A1.8 1.8 0 0 1 4.8 4h4.4l2 2H19a2 2 0 0 1 2 2" /></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.8c-1.1 1.1-1.9 1.4-1.9 3.2m0 3h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" /></>,
    media: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    script: <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5V8h4M8.5 12h7m-7 3.5h7" /></>,
    send: <><path d="m21 3-7.5 18-3.5-7-7-3.5L21 3Z" /><path d="M10 14 21 3" /></>,
    settings: <><path d="M9.5 3.5v2.1M14.5 3.5v2.1M7.6 8.3l1.5 1.5M14.9 8.3l-1.5 1.5M5.8 18.5l1.6-1.7M18.2 18.5l-1.6-1.7M3.5 12h2.1M18.4 12h2.1M12 7.5c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5S7.5 14.5 7.5 12 9.5 7.5 12 7.5Z" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    subtitles: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15h4M15 15h2M7 11h10" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    film: <><rect x="2" y="2" width="20" height="20" rx="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></>,
    render: <><polygon points="5 3 19 12 5 21 5 3" /></>,
    trash: <><path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3z" /><path d="m8 10 4 2-4 2v-4Z" /></>,
    warning: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
  };

  return <svg aria-hidden="true" className="icon" {...common}>{paths[name] ?? paths.spark}</svg>;
}

function metricValue(state: StorageState, value: number) {
  return state === "ready" ? String(value).padStart(2, "0") : "â€”";
}

function statusLabel(status: Project["status"]) {
  return status === "in_progress" ? "In production" : status === "completed" ? "Completed" : "Draft";
}

const MEDIA_STORAGE_KEY = "ai-youtube-studio.media";

function readStoredMedia(): MediaAsset[] {
  try {
    const raw = window.localStorage.getItem(MEDIA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MediaAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistStoredMedia(assets: MediaAsset[]) {
  window.localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(assets));
}

function inferMediaType(fileName: string): MediaAsset["type"] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
    return "image";
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".mkv")) {
    return "video";
  }
  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".aac") || lower.endsWith(".ogg")) {
    return "audio";
  }
  return "document";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

const PROVIDER_STORAGE_KEY = "ai-youtube-studio.providers";
const RESEARCH_STORAGE_KEY = "ai-youtube-studio.research";
const SCRIPT_STORAGE_KEY = "ai-youtube-studio.script";
const STORYBOARD_STORAGE_KEY = "ai-youtube-studio.storyboard";
const VISUAL_STYLE_STORAGE_KEY = "ai-youtube-studio.visual-style";
const IMAGE_GENERATION_STORAGE_KEY = "ai-youtube-studio.image-generation";

const DEFAULT_VISUAL_STYLE_PROFILE = createVisualStyleProfile({
  name: "Creator cinematic",
  artStyle: "cinematic",
  colorPalette: ["deep blue", "soft white", "warm amber"],
  lighting: "soft daylight",
  environmentDescription: "Minimal creator workspace with practical props and a calm studio backdrop",
  consistencyInstructions: "Keep a consistent cinematic look, warm lighting, and polished creator framing across scenes.",
  locked: true,
});

const DEFAULT_IMAGE_GENERATION_CONFIG: ImageGenerationConfig = {
  provider: "gemini",
  model: "imagen-3.0-generate-002",
  enabled: false,
  status: "unavailable",
};

function readStoredProviderConfig(): ProviderConfig {
  try {
    const raw = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return DEFAULT_PROVIDER_CONFIG;
    const config = restoreProviderConfig(JSON.parse(raw));
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(serializeProviderConfig(config)));
    return config;
  } catch {
    return DEFAULT_PROVIDER_CONFIG;
  }
}

function persistStoredProviderConfig(config: ProviderConfig) {
  window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(serializeProviderConfig(config)));
}

function readStoredResearchBrief(): ResearchBrief | null {
  try {
    const raw = window.localStorage.getItem(RESEARCH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResearchBrief;
  } catch {
    return null;
  }
}

function persistStoredResearchBrief(brief: ResearchBrief) {
  window.localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(brief));
}

function readStoredScriptDocument(): ScriptDocument | null {
  try {
    const raw = window.localStorage.getItem(SCRIPT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScriptDocument;
  } catch {
    return null;
  }
}

function persistStoredScriptDocument(document: ScriptDocument) {
  window.localStorage.setItem(SCRIPT_STORAGE_KEY, JSON.stringify(document));
}

function readStoredStoryboard(): StoryboardDocument | null {
  try {
    const raw = window.localStorage.getItem(STORYBOARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoryboardDocument;
  } catch {
    return null;
  }
}

function persistStoredStoryboard(document: StoryboardDocument) {
  window.localStorage.setItem(STORYBOARD_STORAGE_KEY, JSON.stringify(document));
}

function readStoredVisualStyleProfile(): VisualStyleProfile {
  try {
    const raw = window.localStorage.getItem(VISUAL_STYLE_STORAGE_KEY);
    if (!raw) return DEFAULT_VISUAL_STYLE_PROFILE;
    return { ...DEFAULT_VISUAL_STYLE_PROFILE, ...JSON.parse(raw) } as VisualStyleProfile;
  } catch {
    return DEFAULT_VISUAL_STYLE_PROFILE;
  }
}

function persistStoredVisualStyleProfile(profile: VisualStyleProfile) {
  window.localStorage.setItem(VISUAL_STYLE_STORAGE_KEY, JSON.stringify(profile));
}

function readStoredImageGenerationConfig(): ImageGenerationConfig {
  try {
    const raw = window.localStorage.getItem(IMAGE_GENERATION_STORAGE_KEY);
    if (!raw) return DEFAULT_IMAGE_GENERATION_CONFIG;
    const { apiKey: _legacyKey, ...saved } = JSON.parse(raw) as Record<string, unknown>;
    const config = { ...DEFAULT_IMAGE_GENERATION_CONFIG, ...saved, enabled: false } as ImageGenerationConfig;
    persistStoredImageGenerationConfig(config);
    return config;
  } catch {
    return DEFAULT_IMAGE_GENERATION_CONFIG;
  }
}

function persistStoredImageGenerationConfig(config: ImageGenerationConfig) {
  window.localStorage.setItem(IMAGE_GENERATION_STORAGE_KEY, JSON.stringify({
    provider: config.provider,
    model: config.model,
    enabled: false,
    status: config.status,
  }));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof (error as any).message === "string") {
      return (error as any).message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      // fallback
    }
  }
  return String(error || "An unexpected error occurred.");
}

export default App;
