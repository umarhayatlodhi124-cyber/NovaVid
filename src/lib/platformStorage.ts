// NovaVid AI Studio — Platform-Aware Storage Adapter
// Supports Windows Desktop (Tauri + SQLite) and Web Browser (Firebase Cloud Firestore + User Cache)
// Target Project: novavid-ecfc8
// Brand: LODHI TECHX

import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import type { Project, ProjectInput, ProjectLanguage } from "./project";

export function isTauriEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)
  );
}

export function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const GUEST_STORAGE_KEY = "novavid_guest_projects_cache";
const CLOUD_CACHE_PREFIX = "novavid_cloud_projects_";

let inMemoryGuestProjects: Project[] = [];
let inMemoryCloudProjects: Record<string, Project[]> = {};

/**
 * Returns current authenticated user ID or null if unauthenticated web visitor
 */
export function getWebStorageUserId(): string | null {
  return auth?.currentUser?.uid || null;
}

/**
 * Local cache helpers for user-specific data and guest projects
 */
function getGuestProjects(): Project[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return [...inMemoryGuestProjects];
}

function setGuestProjects(projects: Project[]): void {
  inMemoryGuestProjects = [...projects];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // quota or storage unavailable
    }
  }
}

function getUserCache(uid: string): Project[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(`${CLOUD_CACHE_PREFIX}${uid}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return inMemoryCloudProjects[uid] ? [...inMemoryCloudProjects[uid]] : [];
}

function setUserCache(uid: string, projects: Project[]): void {
  inMemoryCloudProjects[uid] = [...projects];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(`${CLOUD_CACHE_PREFIX}${uid}`, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }
}

/**
 * Web Firestore Project Storage Manager
 */
export class WebFirestoreProjectStorage {
  static lastSyncError: string | null = null;
  static lastSyncTimestamp: string | null = null;

  /**
   * List projects. If authenticated, reads strictly from Cloud Firestore.
   * If unauthenticated, returns local guest drafts.
   */
  static async listProjects(): Promise<Project[]> {
    this.lastSyncError = null;
    const user = auth?.currentUser;

    if (user?.uid) {
      try {
        const q = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const firestoreProjects: Project[] = [];

        snap.forEach((d) => {
          const data = d.data();
          firestoreProjects.push({
            id: data.id || d.id,
            name: data.name || "Untitled Project",
            topic: data.topic || "",
            language: (data.language || "English") as ProjectLanguage,
            status: data.status || "draft",
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          });
        });

        // Sort by updated_at descending
        firestoreProjects.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

        setUserCache(user.uid, firestoreProjects);
        this.lastSyncTimestamp = new Date().toISOString();
        return firestoreProjects;
      } catch (err: any) {
        this.lastSyncError = err?.message || String(err);
        console.error("Cloud Firestore list query failed:", err);
        // If offline, fall back to this user's local cache
        const cached = getUserCache(user.uid);
        if (cached.length > 0) {
          return cached;
        }
        throw new Error(
          `Could not connect to Cloud Firestore for user ${user.email || user.uid}: ${this.lastSyncError}`
        );
      }
    }

    // Guest / Unauthenticated: return local guest projects
    return getGuestProjects();
  }

  /**
   * Create a new project.
   * If authenticated, writes strictly to Cloud Firestore. Throws on error (no silent mask).
   * If unauthenticated, saves to guest storage.
   */
  static async createProject(input: ProjectInput): Promise<Project> {
    this.lastSyncError = null;
    const user = auth?.currentUser;
    const now = new Date().toISOString();

    const project: Project = {
      id: safeUUID(),
      name: input.name,
      topic: input.topic,
      language: input.language as ProjectLanguage,
      status: "draft",
      created_at: now,
      updated_at: now,
    };

    if (user?.uid) {
      const cloudPayload = {
        ...project,
        userId: user.uid,
      };

      try {
        const docRef = doc(db, "projects", project.id);
        await setDoc(docRef, cloudPayload);

        // Also persist to nested multi-tenant path: users/{uid}/projects/{projectId}
        const userProjectRef = doc(db, "users", user.uid, "projects", project.id);
        await setDoc(userProjectRef, cloudPayload);
      } catch (err: any) {
        this.lastSyncError = err?.message || String(err);
        console.error("Cloud Firestore project creation failed:", err);
        throw new Error(
          `Cloud persistence failed: ${this.lastSyncError}. Project was not saved to Cloud Firestore.`
        );
      }

      // Update user cache on confirmed write
      const current = getUserCache(user.uid);
      setUserCache(user.uid, [project, ...current]);
      this.lastSyncTimestamp = new Date().toISOString();
      return project;
    }

    // Guest Mode
    const current = getGuestProjects();
    setGuestProjects([project, ...current]);
    return project;
  }

  /**
   * Update an existing project in Cloud Firestore or guest storage
   */
  static async updateProject(id: string, input: ProjectInput): Promise<void> {
    this.lastSyncError = null;
    const user = auth?.currentUser;
    const now = new Date().toISOString();

    if (user?.uid) {
      try {
        const updatePayload = {
          name: input.name,
          topic: input.topic,
          language: input.language,
          updated_at: now,
          userId: user.uid,
        };
        await setDoc(doc(db, "projects", id), updatePayload, { merge: true });
        await setDoc(doc(db, "users", user.uid, "projects", id), updatePayload, { merge: true });
      } catch (err: any) {
        this.lastSyncError = err?.message || String(err);
        console.error("Cloud Firestore update failed:", err);
        throw new Error(`Failed to update project in Cloud Firestore: ${this.lastSyncError}`);
      }

      // Update cache
      const current = getUserCache(user.uid);
      const updated = current.map((p) =>
        p.id === id
          ? { ...p, name: input.name, topic: input.topic, language: input.language as ProjectLanguage, updated_at: now }
          : p
      );
      setUserCache(user.uid, updated);
      this.lastSyncTimestamp = new Date().toISOString();
      return;
    }

    // Guest Mode
    const current = getGuestProjects();
    const updated = current.map((p) =>
      p.id === id
        ? { ...p, name: input.name, topic: input.topic, language: input.language as ProjectLanguage, updated_at: now }
        : p
    );
    setGuestProjects(updated);
  }

  /**
   * Delete a project from Cloud Firestore or guest storage
   */
  static async deleteProject(id: string): Promise<void> {
    this.lastSyncError = null;
    const user = auth?.currentUser;

    if (user?.uid) {
      try {
        await deleteDoc(doc(db, "projects", id));
        await deleteDoc(doc(db, "users", user.uid, "projects", id));
      } catch (err: any) {
        this.lastSyncError = err?.message || String(err);
        console.error("Cloud Firestore delete failed:", err);
        throw new Error(`Failed to delete project from Cloud Firestore: ${this.lastSyncError}`);
      }

      // Remove from cache
      const current = getUserCache(user.uid);
      setUserCache(user.uid, current.filter((p) => p.id !== id));
      this.lastSyncTimestamp = new Date().toISOString();
      return;
    }

    // Guest Mode
    const current = getGuestProjects();
    setGuestProjects(current.filter((p) => p.id !== id));
  }

  /**
   * Migrates local guest projects to Cloud Firestore for the authenticated user
   */
  static async syncGuestProjectsToCloud(): Promise<number> {
    const user = auth?.currentUser;
    if (!user?.uid) {
      throw new Error("Must be signed in to sync guest projects to Cloud Firestore.");
    }

    const guest = getGuestProjects();
    if (guest.length === 0) return 0;

    let syncedCount = 0;
    for (const p of guest) {
      const docRef = doc(db, "projects", p.id);
      await setDoc(docRef, {
        ...p,
        userId: user.uid,
      }, { merge: true });
      syncedCount++;
    }

    // Clear guest storage
    setGuestProjects([]);

    // Refresh user cache
    await this.listProjects();
    return syncedCount;
  }

  static getGuestProjectsCount(): number {
    return getGuestProjects().length;
  }
}
