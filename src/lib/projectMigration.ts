// NovaVid AI Studio — Local Project to Cloud Migration Service
// Brand: LODHI TECHX
// Target Project: novavid-ecfc8

import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { listProjects } from "./projects";
import type { Project } from "./project";

export interface MigrationSummary {
  totalDetected: number;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
  timestamp: string;
}

const MIGRATED_PROJECTS_KEY = "novavid_migrated_project_ids";
let inMemoryMigratedIds: string[] = [];

function getMigratedIds(): string[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(MIGRATED_PROJECTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  return [...inMemoryMigratedIds];
}

function markProjectMigrated(id: string): void {
  if (!inMemoryMigratedIds.includes(id)) {
    inMemoryMigratedIds.push(id);
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const ids = getMigratedIds();
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(MIGRATED_PROJECTS_KEY, JSON.stringify(ids));
      }
    } catch {
      // ignore
    }
  }
}

export function clearMigratedMemoryForTests(): void {
  inMemoryMigratedIds = [];
}

/**
 * Detects local projects that have not yet been migrated to Cloud Firestore
 */
export async function detectUnmigratedProjects(): Promise<Project[]> {
  try {
    const all = await listProjects();
    const migratedIds = getMigratedIds();
    return all.filter((p) => !migratedIds.includes(p.id));
  } catch (err) {
    console.error("Failed to detect unmigrated projects:", err);
    return [];
  }
}

/**
 * Migrates selected local projects to Cloud Firestore under the authenticated user's tenant
 */
export async function migrateProjectsToCloud(
  projectsToMigrate: Project[],
  targetUid: string
): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    totalDetected: projectsToMigrate.length,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  const migratedIds = getMigratedIds();

  for (const project of projectsToMigrate) {
    if (migratedIds.includes(project.id)) {
      summary.skippedCount++;
      continue;
    }

    try {
      // 1. Write to nested multi-tenant path: users/{uid}/projects/{projectId}
      const userProjectRef = doc(db, "users", targetUid, "projects", project.id);
      const payload = {
        id: project.id,
        name: project.name,
        topic: project.topic,
        language: project.language,
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        userId: targetUid,
        migratedAt: summary.timestamp,
        source: "desktop_local_migration",
      };
      await setDoc(userProjectRef, payload, { merge: true });

      // 2. Also write to top-level projects/{projectId} for query compatibility
      const topLevelRef = doc(db, "projects", project.id);
      await setDoc(topLevelRef, payload, { merge: true });

      markProjectMigrated(project.id);
      summary.migratedCount++;
    } catch (err: any) {
      console.error(`Migration error for project ${project.id}:`, err);
      summary.errors.push(`Project "${project.name}": ${err?.message || String(err)}`);
    }
  }

  return summary;
}
