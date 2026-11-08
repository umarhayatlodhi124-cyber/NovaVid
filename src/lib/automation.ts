// NovaVid AI Studio 2.0 — Multi-Tenant Multi-Niche Daily Automation Engine
// Supports universal YouTube niches, tenant-specific channel & voice preferences,
// configurable daily targets (default 3 Shorts + 3 Long videos), and strict tenant isolation.

import { db, auth } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
} from "firebase/firestore";
import type { ProjectLanguage } from "./project";

export interface NicheDefinition {
  id: string;
  name: string;
  nameUrdu: string;
  category: string;
  icon: string;
  color: string;
  subNiches: string[];
  sampleTopics: string[];
  defaultLanguage: ProjectLanguage;
}

export const NICHE_CATALOG: NicheDefinition[] = [
  {
    id: "tech_ai",
    name: "Technology & AI",
    nameUrdu: "ٹیکنالوجی اور مصنوعی ذہانت",
    category: "Science & Technology",
    icon: "🤖",
    color: "#00F0FF",
    subNiches: [
      "AI Tools & Automation",
      "Software Engineering",
      "Gadgets & Hardware",
      "Cybersecurity",
      "Future Tech & Robotics",
    ],
    sampleTopics: [
      "Top 5 AI Tools That Will Replace Programmers in 2026",
      "How Autonomous AI Agents Are Revolutionizing Content Creation",
      "Quantum Computing Explained in 60 Seconds",
      "Is AI Video Rendering Ready for Hollywood?",
      "The Ultimate Cyber Security Checklist for Creators",
    ],
    defaultLanguage: "English",
  },
  {
    id: "cooking_food",
    name: "Cooking & Culinary Arts",
    nameUrdu: "کھانے اور ریسیپیز",
    category: "Howto & Style",
    icon: "🍳",
    color: "#F59E0B",
    subNiches: [
      "Quick 15-Minute Meals",
      "Traditional & Street Food",
      "Baking & Desserts",
      "Healthy Diet & Keto",
      "Restaurant Style Secrets",
    ],
    sampleTopics: [
      "Authentic Biryani Recipe in Under 30 Minutes",
      "5 Secret Spices Master Chefs Never Tell You",
      "Crispy Garlic Butter Steak Bites",
      "Healthy Breakfast Smoothies for High Energy",
      "Street Food Secrets from Around the World",
    ],
    defaultLanguage: "Urdu",
  },
  {
    id: "finance_crypto",
    name: "Finance & Wealth Building",
    nameUrdu: "مالیات، سرمایہ کاری اور کرپٹو",
    category: "Education",
    icon: "📈",
    color: "#10B981",
    subNiches: [
      "Personal Budgeting & Savings",
      "Stock Market Investing",
      "Cryptocurrency & Web3",
      "Passive Income Streams",
      "Real Estate Investing",
    ],
    sampleTopics: [
      "How to Invest Your First $1,000 in 2026",
      "3 Passive Income Ideas You Can Start With $0",
      "Bitcoin Halving Aftermath: What You Must Know",
      "The Psychology of Money: Why Most People Stay Broke",
      "How Compound Interest Creates Multi-Millionaires",
    ],
    defaultLanguage: "English",
  },
  {
    id: "health_fitness",
    name: "Health & Fitness",
    nameUrdu: "صحت اور ورزش",
    category: "Howto & Style",
    icon: "💪",
    color: "#EF4444",
    subNiches: [
      "Fat Loss & Nutrition",
      "Home Workouts & Calisthenics",
      "Muscle Hypertrophy",
      "Mental Health & Sleep",
      "Yoga & Mobility",
    ],
    sampleTopics: [
      "10-Minute Morning Calisthenics Routine for Busy People",
      "The Science of Burning Belly Fat Safely",
      "Stop Doing These 4 Gym Mistakes Immediately",
      "How 8 Hours of Sleep Multiplies Muscle Growth",
      "Intermittent Fasting: Complete Beginner Guide",
    ],
    defaultLanguage: "English",
  },
  {
    id: "gaming_esports",
    name: "Gaming & Esports",
    nameUrdu: "گیمنگ اور ای اسپورٹس",
    category: "Gaming",
    icon: "🎮",
    color: "#8B5CF6",
    subNiches: [
      "Game Reviews & First Looks",
      "Walkthroughs & Pro Guides",
      "Top 10 Epic Moments",
      "Gaming Lore & Easter Eggs",
      "Esports Tournaments",
    ],
    sampleTopics: [
      "Top 10 Open World Games Releasing in 2026",
      "Secret Lore You Missed in GTA VI",
      "How Pro Gamers Aim With Precision",
      "The Rise and Fall of Iconic Gaming Franchises",
      "Unreal Engine 6: Photorealism Breakdown",
    ],
    defaultLanguage: "English",
  },
  {
    id: "motivation_mindset",
    name: "Motivation & Self-Growth",
    nameUrdu: "حوصلہ افزائی اور خود شناسی",
    category: "Education",
    icon: "🔥",
    color: "#F97316",
    subNiches: [
      "Stoic Philosophy",
      "Daily Productivity & Habits",
      "Overcoming Procrastination",
      "Public Speaking & Confidence",
      "Biographies of Great Leaders",
    ],
    sampleTopics: [
      "Marcus Aurelius: 3 Stoic Rules for Mental Toughness",
      "How to Destroy Procrastination in 5 Seconds",
      "The 5 AM Miracle: How Ultra Successful People Start Their Day",
      "Why Discipline Always Beats Motivation",
      "How to Stay Calm Under Immense Pressure",
    ],
    defaultLanguage: "Urdu",
  },
  {
    id: "history_mysteries",
    name: "History & Unsolved Mysteries",
    nameUrdu: "تاریخ اور پراسرار حقائق",
    category: "Entertainment",
    icon: "🏛️",
    color: "#D97706",
    subNiches: [
      "Ancient Civilizations",
      "World War Tactical Breakdowns",
      "Unsolved Historical Mysteries",
      "Lost Empires & Treasures",
      "Historical Paradoxes",
    ],
    sampleTopics: [
      "How the Pyramids Were Really Built: New Archaeological Proof",
      "The Untamed Story of the Indus Valley Civilization",
      "3 Tactical Secrets That Won World War II",
      "The Mysterious Disappearance of Ancient Cities",
      "The Most Bizarre Rulers in Human History",
    ],
    defaultLanguage: "Urdu",
  },
  {
    id: "science_space",
    name: "Science & Space Exploration",
    nameUrdu: "سائنس اور خلائی تحقیق",
    category: "Science & Technology",
    icon: "🚀",
    color: "#3B82F6",
    subNiches: [
      "Cosmology & Black Holes",
      "James Webb Space Discoveries",
      "Quantum Mechanics Made Simple",
      "Futuristic Physics",
      "Astrobiology & Alien Worlds",
    ],
    sampleTopics: [
      "What Truly Happens When You Fall Into a Black Hole?",
      "James Webb Telescope Shocking Discovery at the Edge of Universe",
      "Can We Ever Travel Faster Than Light?",
      "The Ocean Worlds Inside Our Solar System",
      "Quantum Entanglement: Spooky Action Explained",
    ],
    defaultLanguage: "English",
  },
  {
    id: "custom",
    name: "Custom / Specialized Niche",
    nameUrdu: "اپنی مرضی کا نیش",
    category: "Custom",
    icon: "✨",
    color: "#EC4899",
    subNiches: ["General Custom", "Specialized Focus"],
    sampleTopics: [],
    defaultLanguage: "English",
  },
];

export interface TenantAutomationConfig {
  userId: string;
  channelId: string;
  channelTitle: string;
  niche: string;
  subNiche: string;
  customTopics: string[];
  excludedTopics: string[];
  language: ProjectLanguage;
  voiceId: string;
  voiceGender: "Male" | "Female";
  dailyShortsTarget: number; // default: 3
  dailyLongTarget: number;   // default: 3
  scheduleTimezone: string;  // e.g. "Asia/Karachi", "UTC"
  shortsPublishTimes: string[]; // e.g. ["10:00", "14:00", "18:00"]
  longPublishTimes: string[];   // e.g. ["12:00", "16:00", "20:00"]
  approvalMode: "auto_publish" | "require_approval";
  privacyDefault: "private" | "unlisted" | "public";
  enabled: boolean;
  updatedAt: string;
}

export interface DailyAutomationJob {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  format: "short" | "long";
  slotIndex: number;
  scheduledTime: string; // e.g. "14:00"
  niche: string;
  subNiche: string;
  topic: string;
  status:
    | "scheduled"
    | "researching"
    | "scripting"
    | "rendering"
    | "ready_for_approval"
    | "uploading"
    | "published"
    | "failed";
  projectId?: string;
  videoPath?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// In-memory fallback caches for isolated tenant testing and desktop/offline
const memoryTenantConfigs: Record<string, TenantAutomationConfig> = {};
const memoryTenantJobs: Record<string, DailyAutomationJob[]> = {};

/**
 * Creates default initial config for a tenant.
 * Sets LODHI TECHX to Technology, while general customers start with configurable defaults.
 */
export function createDefaultTenantConfig(
  userId: string,
  userEmail?: string | null,
  channelId = "",
  channelTitle = ""
): TenantAutomationConfig {
  const isOwner =
    userEmail?.toLowerCase() === "test.lodhitechx@novavid.studio" ||
    userEmail?.toLowerCase() === "umarhayatlodhi124@gmail.com" ||
    userEmail?.toLowerCase() === "umarhayatlodhi25@gmail.com";

  // LODHI TECHX default is Technology; other tenants can select freely
  const initialNiche = isOwner ? "tech_ai" : "cooking_food";
  const initialSubNiche = isOwner ? "AI Tools & Automation" : "Quick 15-Minute Meals";
  const initialLang: ProjectLanguage = isOwner ? "Urdu" : "English";

  return {
    userId,
    channelId: channelId || (isOwner ? "UCL1USyVzIikDT-K1OIg69_w" : ""),
    channelTitle: channelTitle || (isOwner ? "Lodhi TechX" : "My YouTube Channel"),
    niche: initialNiche,
    subNiche: initialSubNiche,
    customTopics: isOwner
      ? [
          "LODHI TECHX Autonomous AI Video Pipeline",
          "Next-Gen Video Generation with NovaVid 2.0",
        ]
      : [],
    excludedTopics: ["Controversial", "Explicit", "Political Arguments"],
    language: initialLang,
    voiceId: initialLang === "Urdu" ? "ur-PK-AsadNeural" : "en-US-GuyNeural",
    voiceGender: "Male",
    dailyShortsTarget: 3,
    dailyLongTarget: 3,
    scheduleTimezone: "Asia/Karachi",
    shortsPublishTimes: ["10:00", "14:00", "18:00"],
    longPublishTimes: ["12:00", "16:00", "20:00"],
    approvalMode: isOwner ? "auto_publish" : "require_approval",
    privacyDefault: "private",
    enabled: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads tenant automation config strictly isolated by userId.
 */
export async function getTenantAutomationConfig(
  userId: string,
  userEmail?: string | null
): Promise<TenantAutomationConfig> {
  if (!userId) {
    throw new Error("Cannot load automation config: Missing userId.");
  }

  // 1. Try Cloud Firestore if available and authenticated as userId
  if (db && auth?.currentUser?.uid === userId) {
    try {
      const configRef = doc(db, "users", userId, "automation", "config");
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data() as TenantAutomationConfig;
        memoryTenantConfigs[userId] = data;
        return data;
      }
    } catch {
      // Fallback to local cache
    }
  }

  // 2. Local storage cache (isolated by key per tenant)
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const key = `novavid_automation_config_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryTenantConfigs[userId] = parsed;
        return parsed;
      }
    } catch {
      // Ignore
    }
  }

  // 3. In-memory cache
  if (memoryTenantConfigs[userId]) {
    return memoryTenantConfigs[userId];
  }

  // 4. Default fresh config
  const fresh = createDefaultTenantConfig(userId, userEmail);
  memoryTenantConfigs[userId] = fresh;
  return fresh;
}

/**
 * Saves tenant automation config strictly isolated by userId.
 */
export async function saveTenantAutomationConfig(
  config: TenantAutomationConfig
): Promise<void> {
  if (!config.userId) {
    throw new Error("Cannot save automation config: Missing userId.");
  }

  config.updatedAt = new Date().toISOString();
  memoryTenantConfigs[config.userId] = { ...config };

  // 1. Local storage cache
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(
        `novavid_automation_config_${config.userId}`,
        JSON.stringify(config)
      );
    } catch {
      // Ignore
    }
  }

  // 2. Cloud Firestore if authenticated
  if (db && auth?.currentUser?.uid === config.userId) {
    try {
      const configRef = doc(db, "users", config.userId, "automation", "config");
      await setDoc(configRef, config, { merge: true });
    } catch (err: any) {
      console.warn("Could not save automation config to Firestore:", err?.message);
    }
  }
}

/**
 * Generates an idempotent daily batch of scheduled jobs (e.g. 3 Shorts + 3 Long videos).
 */
export function generateDailyJobBatch(
  config: TenantAutomationConfig,
  dateStr = new Date().toISOString().slice(0, 10)
): DailyAutomationJob[] {
  const nicheDef = NICHE_CATALOG.find((n) => n.id === config.niche);
  const existingForUser = memoryTenantJobs[config.userId] || [];

  // Filter out any jobs already existing for this date to enforce idempotency
  const existingDateJobs = existingForUser.filter((j) => j.date === dateStr);
  if (existingDateJobs.length >= config.dailyShortsTarget + config.dailyLongTarget) {
    return existingDateJobs;
  }

  const generatedJobs: DailyAutomationJob[] = [];
  const topicPool = [
    ...(config.customTopics || []),
    ...(nicheDef?.sampleTopics || [
      `${config.niche} Master Guide Part 1`,
      `${config.niche} Top 5 Strategies for Success`,
      `${config.niche} Essential Secrets Revealed`,
      `${config.niche} Complete Step-by-Step Tutorial`,
      `${config.niche} Common Beginner Mistakes`,
      `${config.niche} Ultimate Breakdown`,
    ]),
  ].filter((t) => !config.excludedTopics.some((ex) => t.toLowerCase().includes(ex.toLowerCase())));

  let topicIndex = 0;

  // 1. Generate Shorts Slots
  for (let s = 0; s < config.dailyShortsTarget; s++) {
    const slotId = `job-${config.userId}-${dateStr}-short-${s + 1}`;
    // Check if slot already exists
    const existing = existingDateJobs.find((j) => j.id === slotId);
    if (existing) {
      generatedJobs.push(existing);
      continue;
    }

    const scheduledTime = config.shortsPublishTimes[s] || `${10 + s * 3}:00`;
    const selectedTopic = topicPool[topicIndex % Math.max(1, topicPool.length)] || `${config.subNiche} Quick Tip #${s + 1}`;
    topicIndex++;

    const job: DailyAutomationJob = {
      id: slotId,
      userId: config.userId,
      date: dateStr,
      format: "short",
      slotIndex: s + 1,
      scheduledTime,
      niche: config.niche,
      subNiche: config.subNiche,
      topic: `${selectedTopic} [Shorts]`,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };
    generatedJobs.push(job);
  }

  // 2. Generate Long Video Slots
  for (let l = 0; l < config.dailyLongTarget; l++) {
    const slotId = `job-${config.userId}-${dateStr}-long-${l + 1}`;
    const existing = existingDateJobs.find((j) => j.id === slotId);
    if (existing) {
      generatedJobs.push(existing);
      continue;
    }

    const scheduledTime = config.longPublishTimes[l] || `${12 + l * 4}:00`;
    const selectedTopic = topicPool[topicIndex % Math.max(1, topicPool.length)] || `${config.subNiche} Comprehensive Deep Dive #${l + 1}`;
    topicIndex++;

    const job: DailyAutomationJob = {
      id: slotId,
      userId: config.userId,
      date: dateStr,
      format: "long",
      slotIndex: l + 1,
      scheduledTime,
      niche: config.niche,
      subNiche: config.subNiche,
      topic: `${selectedTopic} [In-Depth]`,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };
    generatedJobs.push(job);
  }

  // Store in memory cache
  const otherJobs = existingForUser.filter((j) => j.date !== dateStr);
  memoryTenantJobs[config.userId] = [...otherJobs, ...generatedJobs];

  return generatedJobs;
}

/**
 * Lists tenant automation jobs strictly isolated by userId.
 */
export async function listTenantAutomationJobs(
  userId: string
): Promise<DailyAutomationJob[]> {
  if (!userId) return [];

  // 1. Try Cloud Firestore if authenticated
  if (db && auth?.currentUser?.uid === userId) {
    try {
      const q = query(collection(db, "users", userId, "daily_jobs"));
      const snap = await getDocs(q);
      const jobs: DailyAutomationJob[] = [];
      snap.forEach((d) => jobs.push(d.data() as DailyAutomationJob));
      if (jobs.length > 0) {
        memoryTenantJobs[userId] = jobs;
        return jobs;
      }
    } catch {
      // Fallback
    }
  }

  return memoryTenantJobs[userId] ? [...memoryTenantJobs[userId]] : [];
}

/**
 * Updates an automation job status (e.g. from scheduled -> rendering -> published).
 */
export async function updateAutomationJob(
  job: DailyAutomationJob
): Promise<void> {
  const userJobs = memoryTenantJobs[job.userId] || [];
  const idx = userJobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    userJobs[idx] = { ...job };
  } else {
    userJobs.push({ ...job });
  }
  memoryTenantJobs[job.userId] = userJobs;

  // Persist to Firestore if authenticated
  if (db && auth?.currentUser?.uid === job.userId) {
    try {
      const jobRef = doc(db, "users", job.userId, "daily_jobs", job.id);
      await setDoc(jobRef, job, { merge: true });
    } catch (err: any) {
      console.warn("Could not save job to Firestore:", err?.message);
    }
  }
}

/**
 * Clean memory cache (used by unit tests)
 */
export function resetAutomationMemoryForTests(): void {
  for (const k of Object.keys(memoryTenantConfigs)) {
    delete memoryTenantConfigs[k];
  }
  for (const k of Object.keys(memoryTenantJobs)) {
    delete memoryTenantJobs[k];
  }
}
