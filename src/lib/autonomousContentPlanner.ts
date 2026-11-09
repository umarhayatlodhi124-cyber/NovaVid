// NovaVid AI Studio 2.1 — Autonomous Content Strategy Planner
// Generates daily/weekly/monthly content calendars with strategic rationale.
// Brand: LODHI TECHX | Founder: Umar Hayat

export type VideoFormat = "long_form" | "shorts" | "series_episode" | "tutorial" | "review" | "documentary";
export type ContentPriority = "trending" | "evergreen" | "seasonal" | "series";
export type PublishDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface ContentSlot {
  id: string;
  date: string;
  dayOfWeek: PublishDay;
  week: number;
  month: number;
  videoTopic: string;
  videoFormat: VideoFormat;
  estimatedDurationMinutes: number;
  priority: ContentPriority;
  strategicRationale: string;
  targetAudience: string;
  recommendedPublishTime: string;
  isShorts: boolean;
  seriesName?: string;
  episodeNumber?: number;
  estimatedProductionDays: number;
  status: "planned" | "in_production" | "completed" | "published";
}

export interface WeeklyStrategy {
  weekNumber: number;
  startDate: string;
  endDate: string;
  slots: ContentSlot[];
  shortsCount: number;
  longFormCount: number;
  totalVideos: number;
  weeklyTheme?: string;
  strategicNotes: string;
}

export interface MonthlyCalendar {
  month: number;
  year: number;
  monthName: string;
  weeks: WeeklyStrategy[];
  totalPlannedVideos: number;
  totalShorts: number;
  totalLongForm: number;
  topicDistribution: { topic: string; count: number }[];
  contentMix: { longForm: number; shorts: number };
  recommendation: string;
}

export interface ContentPlannerConfig {
  niche: string;
  language: string;
  channelGoal: "grow_fast" | "build_authority" | "monetize" | "balanced";
  videosPerWeek: number;
  includeShorts: boolean;
  shortsPerWeek: number;
  startDate?: string;
  weeksToplan: number;
  targetTopics?: string[];
}

const BEST_PUBLISH_TIMES: Record<PublishDay, string> = {
  monday: "18:00 PKT", tuesday: "19:00 PKT", wednesday: "17:00 PKT",
  thursday: "19:00 PKT", friday: "17:00 PKT", saturday: "12:00 PKT", sunday: "12:00 PKT",
};

const DAYS: PublishDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMonthName(month: number): string {
  return ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"][month - 1] || "Unknown";
}

function generateRationale(format: VideoFormat, priority: ContentPriority, niche: string): string {
  const map: Record<string, string> = {
    "shorts_trending": `Short-form ${niche} content captures trending search traffic and YouTube Shorts algorithm distribution.`,
    "shorts_evergreen": `Evergreen Shorts build long-term channel discovery through consistent search indexing.`,
    "tutorial_trending": `Tutorials targeting trending ${niche} topics drive high initial viewership and save-rates.`,
    "tutorial_evergreen": `Evergreen tutorials continue generating views for months — building channel authority.`,
    "long_form_trending": `Long-form videos on trending ${niche} topics establish deep expertise and watch-time metrics.`,
    "long_form_evergreen": `Evergreen long-form content is the backbone of monetization and audience retention.`,
    "series_episode_evergreen": `Series format builds loyal return viewers and improves subscribe-after-watch rates.`,
    "review_trending": `Review content captures high-intent search traffic from buyers and decision-makers.`,
    "documentary_evergreen": `Documentary-style videos drive high average view duration and social sharing.`,
  };
  return map[`${format}_${priority}`] || `${format.replace(/_/g, " ")} content in ${niche} niche aligned with ${priority} strategy.`;
}

export function generateContentCalendar(config: ContentPlannerConfig): ContentSlot[] {
  const { niche, language, videosPerWeek, includeShorts, shortsPerWeek, weeksToplan, targetTopics = [], channelGoal } = config;
  const startDate = config.startDate ? new Date(config.startDate) : new Date();
  const slots: ContentSlot[] = [];

  const defaultTopics = [
    `Complete ${niche} guide for beginners`, `Top 10 ${niche} tips in 2025`,
    `How to master ${niche} fast`, `${niche} mistakes to avoid`,
    `Best ${niche} tools and resources`, `${niche} tutorial step by step`,
    `Why ${niche} matters in 2025`, `${niche} for students and beginners`,
    `Advanced ${niche} techniques`, `${niche} Q&A — your questions answered`,
    `${niche} comparison — which is best?`, `${niche} productivity hacks`,
    `${niche} career roadmap`, `${niche} news and updates`, `${niche} success stories`,
  ];

  const allTopics = targetTopics.length > 0 ? [...targetTopics, ...defaultTopics] : defaultTopics;
  let topicIdx = 0, slotIdx = 0;

  for (let week = 0; week < weeksToplan; week++) {
    const shortsThisWeek = includeShorts ? shortsPerWeek : 0;
    const publishDaysLong: PublishDay[] = channelGoal === "grow_fast"
      ? (["saturday", "wednesday", "friday"] as PublishDay[]).slice(0, Math.min(videosPerWeek, 3))
      : (["saturday", "wednesday"] as PublishDay[]).slice(0, Math.min(videosPerWeek, 2));
    const publishDaysShorts: PublishDay[] = (["tuesday", "thursday", "monday"] as PublishDay[]).slice(0, Math.min(shortsThisWeek, 3));
    const allDays = [...publishDaysLong, ...publishDaysShorts];

    for (let d = 0; d < allDays.length; d++) {
      const dayName = allDays[d];
      const dayIndex = DAYS.indexOf(dayName);
      const slotDate = new Date(startDate);
      slotDate.setDate(startDate.getDate() + week * 7 + dayIndex);

      const isShorts = d >= videosPerWeek;
      const format: VideoFormat = isShorts ? "shorts" : (["tutorial", "long_form", "review", "series_episode", "documentary", "tutorial"] as VideoFormat[])[(d) % 6];
      const priority: ContentPriority = slotIdx % 3 === 0 ? "trending" : slotIdx % 5 === 0 ? "seasonal" : "evergreen";
      const topic = allTopics[topicIdx % allTopics.length];
      topicIdx++;

      slots.push({
        id: `slot_${Date.now()}_${slotIdx}`, date: slotDate.toISOString().split("T")[0],
        dayOfWeek: dayName, week: getWeekNumber(slotDate), month: slotDate.getMonth() + 1,
        videoTopic: isShorts ? `#Shorts: ${topic.substring(0, 40)}` : topic,
        videoFormat: format,
        estimatedDurationMinutes: isShorts ? 1 : format === "tutorial" ? 15 : format === "documentary" ? 20 : 10,
        priority, strategicRationale: generateRationale(format, priority, niche),
        targetAudience: `${language}-speaking ${niche} enthusiasts in Pakistan and globally`,
        recommendedPublishTime: BEST_PUBLISH_TIMES[dayName],
        isShorts, estimatedProductionDays: isShorts ? 1 : 2, status: "planned",
      });
      slotIdx++;
    }
  }
  return slots;
}

export function groupByWeek(slots: ContentSlot[]): WeeklyStrategy[] {
  const weekMap = new Map<number, ContentSlot[]>();
  slots.forEach((s) => { const existing = weekMap.get(s.week) || []; weekMap.set(s.week, [...existing, s]); });
  return Array.from(weekMap.entries()).sort(([a], [b]) => a - b).map(([weekNum, weekSlots]) => {
    const dates = weekSlots.map((s) => s.date).sort();
    const shorts = weekSlots.filter((s) => s.isShorts);
    const longForm = weekSlots.filter((s) => !s.isShorts);
    return {
      weekNumber: weekNum, startDate: dates[0] || "", endDate: dates[dates.length - 1] || "",
      slots: weekSlots, shortsCount: shorts.length, longFormCount: longForm.length,
      totalVideos: weekSlots.length,
      strategicNotes: `Week ${weekNum}: Publish ${longForm.length} long-form video(s) and ${shorts.length} Short(s) for maximum reach.`,
    };
  });
}

export function buildMonthlyCalendar(slots: ContentSlot[], year: number, month: number): MonthlyCalendar {
  const monthSlots = slots.filter((s) => s.month === month);
  const weeks = groupByWeek(monthSlots);
  const topicCounts = new Map<string, number>();
  monthSlots.forEach((s) => { topicCounts.set(s.videoFormat, (topicCounts.get(s.videoFormat) || 0) + 1); });
  const shorts = monthSlots.filter((s) => s.isShorts).length;
  const longForm = monthSlots.filter((s) => !s.isShorts).length;
  const total = monthSlots.length || 1;
  return {
    month, year, monthName: getMonthName(month), weeks,
    totalPlannedVideos: monthSlots.length, totalShorts: shorts, totalLongForm: longForm,
    topicDistribution: Array.from(topicCounts.entries()).map(([topic, count]) => ({ topic, count })),
    contentMix: { longForm: Math.round((longForm / total) * 100), shorts: Math.round((shorts / total) * 100) },
    recommendation: `Publish ${longForm} long-form video(s) and ${shorts} Short(s) in ${getMonthName(month)}. Focus on consistency — aim to publish on the same days each week.`,
  };
}
