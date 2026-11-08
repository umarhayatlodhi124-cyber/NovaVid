// NovaVid AI Studio — Platform-Aware Storage Adapter
// Supports Windows Desktop (Tauri + SQLite) and Web Browser (Firebase Cloud Firestore + Local Cache)
// Target Project: novavid-ecfc8

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

const LOCAL_STORAGE_PROJECTS_KEY = "novavid_web_projects_cache";
const LOCAL_STORAGE_GUEST_UID_KEY = "novavid_web_guest_uid";

let inMemoryProjects: Project[] = [];
let memoryGuestUid = `guest_${safeUUID()}`;

/**
 * Returns current authenticated user ID or persistent guest/anonymous web ID
 */
export function getWebStorageUserId(): string {
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      let guestId = localStorage.getItem(LOCAL_STORAGE_GUEST_UID_KEY);
      if (!guestId) {
        guestId = `guest_${safeUUID()}`;
        localStorage.setItem(LOCAL_STORAGE_GUEST_UID_KEY, guestId);
      }
      return guestId;
    } catch {
      // fallback
    }
  }
  return memoryGuestUid;
}

/**
 * Ensures a valid web user session (authenticates anonymously if unauthenticated)
 */
export async function ensureWebAuthUid(): Promise<string> {
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  try {
    const { signInAnonymously } = await import("firebase/auth");
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch {
    return getWebStorageUserId();
  }
}

/**
 * Local cache helpers for instant UI feedback and 100% offline tolerance in browser
 */
function getCachedProjects(): Project[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return [...inMemoryProjects];
}

function setCachedProjects(projects: Project[]): void {
  inMemoryProjects = [...projects];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch {
      // ignore storage quota errors
    }
  }
}

/**
 * Web Firestore Project Storage Manager
 */
export class WebFirestoreProjectStorage {
  /**
   * List all projects owned by the current web user / guest tenant
   */
  static async listProjects(): Promise<Project[]> {
    const userId = getWebStorageUserId();
    const cached = getCachedProjects().filter((p: any) => !p.userId || p.userId === userId);

    try {
      // Attempt authenticated Firestore query if auth is available
      if (auth?.currentUser?.uid) {
        const q = query(
          collection(db, "projects"),
          where("userId", "==", auth.currentUser.uid)
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

        // Sort by updated_at desc
        firestoreProjects.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

        if (firestoreProjects.length > 0) {
          setCachedProjects(firestoreProjects);
          return firestoreProjects;
        }
      }
    } catch (err) {
      console.warn("Firestore query failed or offline; using local cache:", err);
    }

    return cached;
  }

  /**
   * Create a new project in Cloud Firestore and local cache
   */
  static async createProject(input: ProjectInput): Promise<Project> {
    const userId = getWebStorageUserId();
    const now = new Date().toISOString();
    const project: Project & { userId: string } = {
      id: safeUUID(),
      name: input.name,
      topic: input.topic,
      language: input.language as ProjectLanguage,
      status: "draft",
      created_at: now,
      updated_at: now,
      userId,
    };

    // 1. Instant local cache update (guarantees zero UI lag)
    const current = getCachedProjects();
    setCachedProjects([project, ...current]);

    // 2. Cloud Firestore persistence (if authenticated)
    if (auth?.currentUser?.uid) {
      try {
        const docRef = doc(db, "projects", project.id);
        await setDoc(docRef, project, { merge: true });
      } catch (err) {
        console.warn("Failed to write to Cloud Firestore; persisted in local cache:", err);
      }
    }

    return project;
  }

  /**
   * Update an existing project in Cloud Firestore and local cache
   */
  static async updateProject(id: string, input: ProjectInput): Promise<void> {
    const userId = getWebStorageUserId();
    const now = new Date().toISOString();

    // 1. Update local cache
    const current = getCachedProjects();
    const updated = current.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          name: input.name,
          topic: input.topic,
          language: input.language as ProjectLanguage,
          updated_at: now,
        };
      }
      return p;
    });
    setCachedProjects(updated);

    // 2. Cloud Firestore update
    if (auth?.currentUser?.uid) {
      try {
        const docRef = doc(db, "projects", id);
        await setDoc(
          docRef,
          {
            name: input.name,
            topic: input.topic,
            language: input.language,
            updated_at: now,
            userId,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Failed to update Cloud Firestore; updated in local cache:", err);
      }
    }
  }

  /**
   * Delete a project from Cloud Firestore and local cache
   */
  static async deleteProject(id: string): Promise<void> {
    // 1. Remove from local cache
    const current = getCachedProjects();
    const filtered = current.filter((p) => p.id !== id);
    setCachedProjects(filtered);

    // 2. Remove from Cloud Firestore
    if (auth?.currentUser?.uid) {
      try {
        const docRef = doc(db, "projects", id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn("Failed to delete from Cloud Firestore; removed from local cache:", err);
      }
    }
  }
}
