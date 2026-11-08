const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

// 1. Imports
const importTarget = 'import { ExportManagerPage } from "./components/ExportManagerPage";';
const importReplacement = `${importTarget}\r\nimport { VisualStudioPage } from "./components/VisualStudioPage";`;
if (!content.includes("VisualStudioPage")) {
  content = content.replace(importTarget, importReplacement);
}

// 2. View type
content = content.replace(
  'type View = "dashboard" | "projects" | "media" | "settings" | "providers" | "research" | "scripts" | "storyboard" | "voice" | "subtitles" | "timeline" | "export";',
  'type View = "dashboard" | "projects" | "media" | "settings" | "providers" | "research" | "scripts" | "storyboard" | "visuals" | "voice" | "subtitles" | "timeline" | "export";'
);

// 3. Navigation
const navTarget = '{ label: "Storyboard", view: "storyboard" as const, icon: "video" },';
const navReplacement = `${navTarget}\r\n  { label: "Visual Studio", view: "visuals" as const, icon: "image" },`;
if (!content.includes('view: "visuals"')) {
  content = content.replace(navTarget, navReplacement);
}

// 4. Header title helper
const titleTarget = ': view === "storyboard"\r\n                  ? "Storyboard Studio"';
const titleReplacement = `: view === "storyboard"\r\n                  ? "Storyboard Studio"\r\n                  : view === "visuals"\r\n                    ? "AI Visual Asset Studio"`;
if (!content.includes('view === "visuals"')) {
  content = content.replace(titleTarget, titleReplacement);
}

// 5. JSX View Rendering
const jsxTarget = `              storyboard={storyboard}
              visualStyle={visualStyleProfile}
            />
          ) : view === "voice" ? (`;

const jsxReplacement = `              storyboard={storyboard}
              visualStyle={visualStyleProfile}
            />
          ) : view === "visuals" ? (
            <VisualStudioPage
              projectId={selectedProjectId || projects[0]?.id || ""}
              projectTitle={projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))?.name}
              storyboard={storyboard}
              onNavigateToTimeline={() => setView("timeline")}
            />
          ) : view === "voice" ? (`;

const normalizedContent = content.replace(/\r\n/g, "\n");
const normalizedTarget = jsxTarget.replace(/\r\n/g, "\n");
const normalizedReplacement = jsxReplacement.replace(/\r\n/g, "\n");

if (normalizedContent.includes(normalizedTarget)) {
  const updatedNormalized = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  content = updatedNormalized.replace(/\n/g, "\r\n");
  console.log("JSX target found and replaced!");
} else {
  console.error("jsxTarget not found!");
}

// 6. Icon definition for "image"
const iconTarget = 'film: <><rect x="2" y="2" width="20" height="20" rx="2.18" />';
const iconReplacement = `image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,\r\n    ${iconTarget}`;
if (!content.includes("image: <>")) {
  content = content.replace(iconTarget, iconReplacement);
}

fs.writeFileSync(appPath, content, "utf8");
console.log("App.tsx updated successfully for Stage D.");
