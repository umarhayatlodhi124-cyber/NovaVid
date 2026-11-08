import { getDatabase } from "./database";
import type { Project, ProjectInput, ProjectLanguage, ProjectArchive } from "./project";
import {
  isTauriEnvironment,
  safeUUID,
  WebFirestoreProjectStorage,
} from "./platformStorage";
import {
  ResearchRepository,
  ScriptRepository,
  StoryboardRepository,
  SubtitleRepository,
  TimelineRepository,
  SEORepository,
} from "./repositories";

export { safeUUID };

function formatSqlError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err || "Database operation failed.");
}

export async function listProjects(): Promise<Project[]> {
  if (!isTauriEnvironment()) {
    return await WebFirestoreProjectStorage.listProjects();
  }

  const database = await getDatabase();
  return database.select<Project[]>(
    `SELECT id, name, topic, language, status, created_at, updated_at
     FROM projects
     ORDER BY updated_at DESC`,
  );
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isTauriEnvironment()) {
    const list = await WebFirestoreProjectStorage.listProjects();
    return list.find((p) => p.id === id) || null;
  }

  const database = await getDatabase();
  const rows = await database.select<Project[]>(
    `SELECT id, name, topic, language, status, created_at, updated_at
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  if (!isTauriEnvironment()) {
    return await WebFirestoreProjectStorage.createProject(input);
  }

  const database = await getDatabase();
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: safeUUID(),
    language: input.language as ProjectLanguage,
    status: "draft",
    created_at: now,
    updated_at: now,
  };

  try {
    await database.execute(
      `INSERT INTO projects (id, name, topic, language, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        project.id,
        project.name,
        project.topic,
        project.language,
        project.status,
        project.created_at,
        project.updated_at,
      ],
    );
  } catch (error: unknown) {
    throw new Error(`Failed to create project in database: ${formatSqlError(error)}`);
  }
  return project;
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  if (!isTauriEnvironment()) {
    return await WebFirestoreProjectStorage.updateProject(id, input);
  }

  const database = await getDatabase();
  try {
    const result = await database.execute(
      `UPDATE projects
       SET name = $1, topic = $2, language = $3, updated_at = $4
       WHERE id = $5`,
      [input.name, input.topic, input.language, new Date().toISOString(), id],
    );
    if (result.rowsAffected !== 1) {
      throw new Error("This project no longer exists. Refresh the project list and try again.");
    }
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error(`Failed to update project: ${formatSqlError(error)}`);
  }
}

export async function deleteProject(id: string): Promise<void> {
  if (!isTauriEnvironment()) {
    return await WebFirestoreProjectStorage.deleteProject(id);
  }

  const database = await getDatabase();
  try {
    const result = await database.execute("DELETE FROM projects WHERE id = $1", [id]);
    if (result.rowsAffected !== 1) {
      throw new Error("This project no longer exists. Refresh the project list and try again.");
    }
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error(`Failed to delete project: ${formatSqlError(error)}`);
  }
}

/**
 * Deep clone / duplicate an existing project with all associated assets.
 */
export async function duplicateProject(sourceId: string, newName?: string): Promise<Project> {
  const source = await getProject(sourceId);
  if (!source) {
    throw new Error(`Source project ${sourceId} not found.`);
  }

  const duplicated = await createProject({
    name: newName || `${source.name} (Copy)`,
    topic: source.topic,
    language: source.language,
  });

  // Deep clone related assets across repositories
  try {
    const [research, script, storyboard, subtitles, timeline, seo] = await Promise.all([
      ResearchRepository.getResearch(sourceId).catch(() => null),
      ScriptRepository.getScript(sourceId).catch(() => null),
      StoryboardRepository.getStoryboard(sourceId).catch(() => null),
      SubtitleRepository.getSubtitles(sourceId).catch(() => null),
      TimelineRepository.getTimeline(sourceId).catch(() => null),
      SEORepository.getMetadata(sourceId).catch(() => null),
    ]);

    if (research) {
      await ResearchRepository.saveResearch(duplicated.id, {
        ...research,
        id: safeUUID(),
        topic: duplicated.topic,
      }).catch(() => null);
    }
    if (script) {
      await ScriptRepository.saveScript(duplicated.id, {
        ...script,
        id: safeUUID(),
      }).catch(() => null);
    }
    if (storyboard) {
      await StoryboardRepository.saveStoryboard(duplicated.id, {
        ...storyboard,
        id: safeUUID(),
      }).catch(() => null);
    }
    if (subtitles) {
      await SubtitleRepository.saveSubtitles(duplicated.id, {
        ...subtitles,
        id: safeUUID(),
        projectId: duplicated.id,
      }).catch(() => null);
    }
    if (timeline) {
      await TimelineRepository.saveTimeline(
        duplicated.id,
        timeline.tracks || [],
        timeline.clips || []
      ).catch(() => null);
    }
    if (seo) {
      await SEORepository.saveMetadata({
        ...seo,
        id: safeUUID(),
        projectId: duplicated.id,
      }).catch(() => null);
    }
  } catch (cloneErr) {
    console.warn("Asset deep-clone partial warning:", cloneErr);
  }

  return duplicated;
}

/**
 * Exports complete project metadata, script, storyboard, timeline and subtitles into a portable archive.
 */
export async function exportProjectArchive(projectId: string): Promise<ProjectArchive> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }

  const [research, script, storyboard, subtitles, timeline, seo] = await Promise.all([
    ResearchRepository.getResearch(projectId).catch(() => null),
    ScriptRepository.getScript(projectId).catch(() => null),
    StoryboardRepository.getStoryboard(projectId).catch(() => null),
    SubtitleRepository.getSubtitles(projectId).catch(() => null),
    TimelineRepository.getTimeline(projectId).catch(() => null),
    SEORepository.getMetadata(projectId).catch(() => null),
  ]);

  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    project,
    research: research || undefined,
    script: script || undefined,
    storyboard: storyboard || undefined,
    subtitles: subtitles || undefined,
    timeline: timeline || undefined,
    seo: seo || undefined,
  };
}

/**
 * Imports a portable project archive and persists it.
 */
export async function importProjectArchive(archive: ProjectArchive): Promise<Project> {
  if (!archive || archive.version !== "2.0" || !archive.project) {
    throw new Error("Invalid project archive format. Version 2.0 required.");
  }

  const newProject = await createProject({
    name: `${archive.project.name} (Imported)`,
    topic: archive.project.topic,
    language: archive.project.language,
  });

  if (archive.research) {
    await ResearchRepository.saveResearch(newProject.id, archive.research as any).catch(() => null);
  }
  if (archive.script) {
    await ScriptRepository.saveScript(newProject.id, archive.script as any).catch(() => null);
  }
  if (archive.storyboard) {
    await StoryboardRepository.saveStoryboard(newProject.id, {
      ...(archive.storyboard as any),
      id: safeUUID(),
    }).catch(() => null);
  }
  if (archive.subtitles) {
    await SubtitleRepository.saveSubtitles(newProject.id, {
      ...(archive.subtitles as any),
      id: safeUUID(),
      projectId: newProject.id,
    }).catch(() => null);
  }
  if (archive.timeline) {
    const tl = archive.timeline as any;
    await TimelineRepository.saveTimeline(
      newProject.id,
      tl.tracks || [],
      tl.clips || []
    ).catch(() => null);
  }
  if (archive.seo) {
    await SEORepository.saveMetadata({
      ...(archive.seo as any),
      id: safeUUID(),
      projectId: newProject.id,
    }).catch(() => null);
  }

  return newProject;
}
