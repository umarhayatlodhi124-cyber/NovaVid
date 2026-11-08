import { useState, useEffect } from "react";
import {
  SEOMetadata,
  ChannelCalendarEvent,
  TitleCandidate,
  ChapterTimestamp,
  generateTitleCandidates,
  generateChaptersFromStoryboard,
  generateTags,
  generateHashtags,
  generateThumbnailTexts,
  buildOptimizedDescription,
  calculateTagsBudget,
} from "../lib/seoStudio";
import {
  SEORepository,
  ChannelCalendarRepository,
  StoryboardRepository,
} from "../lib/repositories";
import type { StoryboardDocument } from "../lib/storyboard";

interface SEOStudioPageProps {
  currentProjectId: string | null;
  projectTitle?: string;
  storyboard?: StoryboardDocument | null;
}

export function SEOStudioPage({
  currentProjectId,
  projectTitle,
  storyboard,
}: SEOStudioPageProps) {
  const [selectedTitle, setSelectedTitle] = useState("");
  const [titleCandidates, setTitleCandidates] = useState<TitleCandidate[]>([]);
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<ChapterTimestamp[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [thumbnailTexts, setThumbnailTexts] = useState<string[]>([]);
  const [urduTitle, setUrduTitle] = useState("");
  const [urduDescription, setUrduDescription] = useState("");
  const [newTagInput, setNewTagInput] = useState("");

  // Content Planner Calendar State
  const [calendarEvents, setCalendarEvents] = useState<ChannelCalendarEvent[]>([]);
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split("T")[0]);
  const [schedTime, setSchedTime] = useState("18:00");
  const [schedFormat, setSchedFormat] = useState<"Shorts" | "Long-form" | "Explainer">("Long-form");

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or load SEO metadata
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!currentProjectId) return;

      try {
        const existing = await SEORepository.getMetadata(currentProjectId);
        if (isMounted && existing) {
          setSelectedTitle(existing.selectedTitle);
          setTitleCandidates(existing.titleCandidates);
          setDescription(existing.description);
          setChapters(existing.chapters);
          setTags(existing.tags);
          setHashtags(existing.hashtags);
          setThumbnailTexts(existing.thumbnailTexts);
          setUrduTitle(existing.urduTitle || "");
          setUrduDescription(existing.urduDescription || "");
        } else {
          // Initialize from project topic/title
          const topic = projectTitle || "AI Video Creation";
          const titles = generateTitleCandidates(topic);
          const defaultChapters = generateChaptersFromStoryboard(storyboard);
          const defaultTags = generateTags(topic);
          const defaultHashtags = generateHashtags(topic);
          const defaultThumbs = generateThumbnailTexts(topic);
          const defaultDesc = buildOptimizedDescription(
            topic,
            `In this video, we break down ${topic} with complete step-by-step guidance.`,
            defaultChapters,
            defaultHashtags
          );

          if (isMounted) {
            setSelectedTitle(titles[0].title);
            setTitleCandidates(titles);
            setDescription(defaultDesc);
            setChapters(defaultChapters);
            setTags(defaultTags);
            setHashtags(defaultHashtags);
            setThumbnailTexts(defaultThumbs);
            setUrduTitle(`${topic} - یوٹیوب ویڈیو بنانے کا مکمل طریقہ`);
          }
        }

        const events = await ChannelCalendarRepository.listEvents();
        if (isMounted) {
          setCalendarEvents(events);
        }
      } catch (err: any) {
        console.error("Failed to load SEO metadata:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentProjectId, projectTitle, storyboard]);

  const tagBudget = calculateTagsBudget(tags);

  const handleAddTag = () => {
    const clean = newTagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCopyTags = () => {
    navigator.clipboard.writeText(tags.join(", "));
    setStatusMessage("Tags copied to clipboard (comma-separated for YouTube Studio)!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleGenerateChaptersFromSB = async () => {
    try {
      let sb = storyboard;
      if (!sb && currentProjectId) {
        sb = await StoryboardRepository.getStoryboard(currentProjectId);
      }
      const newCh = generateChaptersFromStoryboard(sb);
      setChapters(newCh);
      setDescription(
        buildOptimizedDescription(
          selectedTitle || projectTitle || "Video",
          "",
          newCh,
          hashtags
        )
      );
      setStatusMessage(`Updated ${newCh.length} chapters from storyboard scenes.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to generate chapters: ${err.message || String(err)}`);
    }
  };

  const handleSaveMetadata = async () => {
    if (!currentProjectId) {
      setErrorMessage("Please select or create an active project first.");
      return;
    }

    try {
      setErrorMessage(null);
      const meta: SEOMetadata = {
        id: `seo-${currentProjectId}`,
        projectId: currentProjectId,
        selectedTitle,
        titleCandidates,
        description,
        chapters,
        tags,
        hashtags,
        thumbnailTexts,
        urduTitle: urduTitle.trim() || undefined,
        urduDescription: urduDescription.trim() || undefined,
        targetAudience: "general",
        categoryId: "28",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await SEORepository.saveMetadata(meta);
      setStatusMessage("SEO Metadata saved to SQLite project repository!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to save SEO metadata: ${err.message || String(err)}`);
    }
  };

  const handleAddCalendarEvent = async () => {
    if (!selectedTitle) return;

    try {
      const newEvent: ChannelCalendarEvent = {
        id: `cal-${Date.now()}`,
        projectId: currentProjectId || undefined,
        title: selectedTitle,
        format: schedFormat,
        status: "planned",
        scheduledDate: schedDate,
        optimalTimeSlot: schedTime,
        notes: `Auto-scheduled from NovaVid SEO Studio. Target Audience: General Creators.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ChannelCalendarRepository.saveEvent(newEvent);
      setCalendarEvents([...calendarEvents, newEvent]);
      setStatusMessage(`Scheduled "${selectedTitle}" for ${schedDate} at ${schedTime}!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to add calendar event: ${err.message || String(err)}`);
    }
  };

  return (
    <div className="seo-studio-container" style={{ padding: "24px", color: "#e2e8f0" }}>
      {/* Studio Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid #334155",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc" }}>
              YouTube SEO & Metadata Studio
            </h1>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "#059669",
                color: "#ecfdf5",
              }}
            >
              Stage G
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
            High-CTR titles, chapter timestamps, 500-char tag budget optimization, Urdu localization, and release scheduler.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleSaveMetadata}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              background: "#3b82f6",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            💾 Save SEO Metadata
          </button>
        </div>
      </header>

      {/* Notifications */}
      {statusMessage && (
        <div
          style={{
            background: "#064e3b",
            color: "#a7f3d0",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fecaca",
            padding: "10px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Main Split Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr", gap: "24px", alignItems: "start" }}>
        {/* Left Pane: Titles, Chapters, Description, Tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Multi-Angle Titles */}
          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "20px", border: "1px solid #334155" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", color: "#f8fafc" }}>
              Multi-Angle Title Generator (High CTR)
            </h2>

            {/* Active Selected Title Input */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Active YouTube Title ({selectedTitle.length}/100 chars)
              </label>
              <input
                type="text"
                value={selectedTitle}
                maxLength={100}
                onChange={(e) => setSelectedTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #3b82f6",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                }}
              />
            </div>

            {/* Candidate Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {titleCandidates.map((cand, idx) => (
                <div
                  key={idx}
                  style={{
                    background: selectedTitle === cand.title ? "#0f172a" : "#182234",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    border: selectedTitle === cand.title ? "1px solid #3b82f6" : "1px solid #334155",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.875rem", color: "#f8fafc", fontWeight: 500 }}>
                      {cand.title}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
                      Angle: <strong style={{ color: "#38bdf8" }}>{cand.style}</strong> | Predicted Score:{" "}
                      <strong style={{ color: "#34d399" }}>{cand.score}/100</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTitle(cand.title)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      background: selectedTitle === cand.title ? "#2563eb" : "#334155",
                      color: "#f8fafc",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {selectedTitle === cand.title ? "Selected" : "Use Title"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Description & Chapters */}
          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>
                Description & Timestamped Chapters
              </h2>
              <button
                onClick={handleGenerateChaptersFromSB}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  background: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Sync Chapters from Storyboard
              </button>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                lineHeight: "1.4",
              }}
            />
          </div>

          {/* Multilingual Urdu Section */}
          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "20px", border: "1px solid #334155" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", color: "#f8fafc" }}>
              Multilingual Localization (اردو / Urdu)
            </h2>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Urdu Translated Title (عنوان)
              </label>
              <input
                type="text"
                dir="rtl"
                value={urduTitle}
                onChange={(e) => setUrduTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "1rem",
                  fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Pane: Tag Budget, Thumbnail Words, Calendar Planner */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* YouTube Tag Budget & Keywords */}
          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc" }}>
                YouTube Tags (Max 500 Chars)
              </h2>
              <button
                onClick={handleCopyTags}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Copy All Tags
              </button>
            </div>

            {/* Budget Meter */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8" }}>
                <span>Budget: {tagBudget.totalChars} / 500 characters</span>
                <span style={{ color: tagBudget.isWithinBudget ? "#34d399" : "#f87171", fontWeight: 700 }}>
                  {tagBudget.remainingChars} chars left
                </span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "#334155", borderRadius: "3px", marginTop: "4px" }}>
                <div
                  style={{
                    width: `${Math.min(100, (tagBudget.totalChars / 500) * 100)}%`,
                    height: "100%",
                    background: tagBudget.isWithinBudget ? "#10b981" : "#ef4444",
                    borderRadius: "3px",
                  }}
                />
              </div>
            </div>

            {/* Add Tag Input */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                placeholder="Add custom keyword tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "4px",
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  fontSize: "0.85rem",
                }}
              />
              <button
                onClick={handleAddTag}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  background: "#334155",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                + Add
              </button>
            </div>

            {/* Tags Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    style={{
                      border: "none",
                      background: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Thumbnail Text Overlay Suggestions */}
          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "20px", border: "1px solid #334155" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#f8fafc" }}>
              Thumbnail High-Impact Text Ideas
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {thumbnailTexts.map((txt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#7c2d12",
                    color: "#ffedd5",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontWeight: 800,
                    fontSize: "0.8rem",
                    letterSpacing: "0.5px",
                  }}
                >
                  {txt}
                </div>
              ))}
            </div>
          </div>

          {/* Channel Content Planner Calendar */}
          <div style={{ background: "#1e293b", borderRadius: "8px", padding: "20px", border: "1px solid #334155" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem", color: "#f8fafc" }}>
              Content Release Scheduler
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target Date</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Time Slot</label>
                <select
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    fontSize: "0.8rem",
                  }}
                >
                  <option value="14:00">14:00 (Early)</option>
                  <option value="18:00">18:00 (Peak US/EU)</option>
                  <option value="20:00">20:00 (Prime Time)</option>
                  <option value="22:00">22:00 (Late Night)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Format</label>
                <select
                  value={schedFormat}
                  onChange={(e) => setSchedFormat(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "4px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    fontSize: "0.8rem",
                  }}
                >
                  <option value="Long-form">Long-form</option>
                  <option value="Shorts">Shorts (9:16)</option>
                  <option value="Explainer">Explainer</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddCalendarEvent}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            >
              + Add to Content Calendar
            </button>

            {/* Upcoming Agenda Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>
                Scheduled Queue ({calendarEvents.length})
              </div>
              {calendarEvents.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: "#0f172a",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #334155",
                    fontSize: "0.8rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{evt.title}</div>
                    <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>
                      {evt.scheduledDate} at {evt.optimalTimeSlot} • {evt.format}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "0.7rem",
                      background: "#1e3a8a",
                      color: "#93c5fd",
                      textTransform: "capitalize",
                    }}
                  >
                    {evt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
