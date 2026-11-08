import { getDatabase } from "./database";
import type { Project, ProjectInput, ProjectLanguage } from "./project";

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

function formatSqlError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err || "Database operation failed.");
}

export async function listProjects(): Promise<Project[]> {
  const database = await getDatabase();
  return database.select<Project[]>(
    `SELECT id, name, topic, language, status, created_at, updated_at
     FROM projects
     ORDER BY updated_at DESC`,
  );
}

export async function createProject(input: ProjectInput): Promise<Project> {
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
