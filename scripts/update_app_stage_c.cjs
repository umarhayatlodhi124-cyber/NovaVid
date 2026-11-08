const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

// 1. Imports
const importTarget = 'import { SubtitleStudioPage } from "./components/SubtitleStudioPage";';
const importReplacement = `${importTarget}\r\nimport { TimelineStudioPage } from "./components/TimelineStudioPage";\r\nimport { ExportManagerPage } from "./components/ExportManagerPage";`;
if (!content.includes("TimelineStudioPage")) {
  content = content.replace(importTarget, importReplacement);
}

// 2. View type
const viewTarget = 'type View = "dashboard" | "projects" | "media" | "settings" | "providers" | "research" | "scripts" | "storyboard" | "voice" | "subtitles";';
const viewReplacement = 'type View = "dashboard" | "projects" | "media" | "settings" | "providers" | "research" | "scripts" | "storyboard" | "voice" | "subtitles" | "timeline" | "export";';
content = content.replace(viewTarget, viewReplacement);

// 3. Navigation
const navTarget = '{ label: "Subtitles", view: "subtitles" as const, icon: "subtitles" },';
const navReplacement = `${navTarget}\r\n  { label: "Timeline Editor", view: "timeline" as const, icon: "film" },\r\n  { label: "Video Export", view: "export" as const, icon: "render" },`;
if (!content.includes('view: "timeline"')) {
  content = content.replace(navTarget, navReplacement);
}

// Remove "Video renderer" from plannedNavigation
content = content.replace('  { label: "Video renderer", icon: "video" },\r\n', '');

// 4. Header view title
const titleTarget = ': view === "subtitles"\r\n                      ? "Subtitle Studio"';
const titleReplacement = `: view === "subtitles"\r\n                      ? "Subtitle Studio"\r\n                      : view === "timeline"\r\n                        ? "Timeline Studio"\r\n                        : view === "export"\r\n                          ? "Video Export & Render"`;
content = content.replace(titleTarget, titleReplacement);

// 5. JSX View Rendering
const jsxTarget = `          ) : view === "subtitles" ? (
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
          ) : (`;

const jsxReplacement = `          ) : view === "subtitles" ? (
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
          ) : view === "timeline" ? (
            <TimelineStudioPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.title}
              onNavigateToExport={() => setView("export")}
            />
          ) : view === "export" ? (
            <ExportManagerPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.title}
              onNavigateToTimeline={() => setView("timeline")}
            />
          ) : (`;

// We handle CRLF variations in jsxTarget
const normalizedContent = content.replace(/\r\n/g, "\n");
const normalizedTarget = jsxTarget.replace(/\r\n/g, "\n");
const normalizedReplacement = jsxReplacement.replace(/\r\n/g, "\n");

if (normalizedContent.includes(normalizedTarget)) {
  const updatedNormalized = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  // Restore CRLF
  content = updatedNormalized.replace(/\n/g, "\r\n");
} else {
  console.error("jsxTarget could not be found!");
}

// 6. Icon definitions
const iconTarget = 'subtitles: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15h4M15 15h2M7 11h10" /></>,';
const iconReplacement = `${iconTarget}\r\n    film: <><rect x="2" y="2" width="20" height="20" rx="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></>,\r\n    render: <><polygon points="5 3 19 12 5 21 5 3" /></>,`;
content = content.replace(iconTarget, iconReplacement);

fs.writeFileSync(appPath, content, "utf8");
console.log("App.tsx updated successfully for Stage C.");
