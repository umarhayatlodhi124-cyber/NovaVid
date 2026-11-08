import { isTauriEnvironment } from "./platformStorage";

export interface DatabaseLike {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(
    query: string,
    bindValues?: unknown[],
  ): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  close?: () => Promise<boolean>;
}

const DATABASE_URL = "sqlite:ai_youtube_studio.db";
let databasePromise: Promise<DatabaseLike> | undefined;

/**
 * In-browser database adapter implementing the Tauri Database interface
 * to gracefully handle repository calls when running in Chrome, Firefox, or Cloudflare/Firebase web hosting.
 */
class BrowserDatabaseAdapter implements DatabaseLike {
  private tables: Record<string, any[]> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = localStorage.getItem("novavid_browser_db_tables");
      if (raw) this.tables = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem("novavid_browser_db_tables", JSON.stringify(this.tables));
    } catch {
      // ignore
    }
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    const match = query.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    const tableName = match ? match[1].toLowerCase() : "";
    const rows = this.tables[tableName] || [];

    if (query.toLowerCase().includes("where id =") || query.toLowerCase().includes("where id=")) {
      const targetId = bindValues[0] || (query.match(/id\s*=\s*'([^']+)'/i)?.[1]);
      if (targetId) {
        return rows.filter((r) => r.id === targetId) as unknown as T;
      }
    }

    if (query.toLowerCase().includes("where provider =") || query.toLowerCase().includes("where provider=")) {
      const targetProvider = bindValues[0] || (query.match(/provider\s*=\s*'([^']+)'/i)?.[1]);
      if (targetProvider) {
        return rows.filter((r) => r.provider === targetProvider) as unknown as T;
      }
    }

    if (query.toLowerCase().includes("where project_id =") || query.toLowerCase().includes("where project_id=")) {
      const targetPid = bindValues[0] || (query.match(/project_id\s*=\s*'([^']+)'/i)?.[1]);
      if (targetPid) {
        return rows.filter((r) => r.project_id === targetPid) as unknown as T;
      }
    }

    return rows as unknown as T;
  }

  async execute(
    query: string,
    bindValues: unknown[] = [],
  ): Promise<{ rowsAffected: number; lastInsertId: number }> {
    const q = query.trim().toUpperCase();

    if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) {
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    const insertMatch = query.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([a-zA-Z0-9_]+)/i);
    const updateMatch = query.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    const deleteMatch = query.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);

    const tableName = (insertMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1] || "").toLowerCase();
    if (!tableName) {
      return { rowsAffected: 1, lastInsertId: 1 };
    }

    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }

    if (deleteMatch) {
      const targetId = bindValues[0];
      if (targetId) {
        this.tables[tableName] = this.tables[tableName].filter(
          (r) => r.id !== targetId && r.project_id !== targetId,
        );
      } else {
        this.tables[tableName] = [];
      }
      this.saveToStorage();
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    if (bindValues.length > 0) {
      const id = String(bindValues[0]);
      const existingIdx = this.tables[tableName].findIndex((r) => r.id === id);
      const record: Record<string, any> = { id };

      const colsMatch = query.match(/\(([^)]+)\)\s+VALUES/i);
      let colNames: string[] = [];
      if (colsMatch) {
        colNames = colsMatch[1].split(",").map((c) => c.trim().toLowerCase());
      }

      bindValues.forEach((val, idx) => {
        if (colNames[idx]) {
          record[colNames[idx]] = val;
        } else {
          record[`col_${idx}`] = val;
        }
      });

      if (existingIdx >= 0) {
        this.tables[tableName][existingIdx] = {
          ...this.tables[tableName][existingIdx],
          ...record,
        };
      } else {
        this.tables[tableName].push(record);
      }
      this.saveToStorage();
    }

    return { rowsAffected: 1, lastInsertId: 1 };
  }
}

export function getDatabase(): Promise<DatabaseLike> {
  if (!databasePromise) {
    if (isTauriEnvironment()) {
      databasePromise = import("@tauri-apps/plugin-sql")
        .then((mod) => mod.default.load(DATABASE_URL) as Promise<DatabaseLike>)
        .catch((error: unknown) => {
          databasePromise = undefined;
          throw new Error(
            error instanceof Error
              ? error.message
              : "The local project database could not be opened.",
          );
        });
    } else {
      // In-browser environment: zero invoke crashes, persistent local web storage
      databasePromise = Promise.resolve(new BrowserDatabaseAdapter());
    }
  }
  return databasePromise!;
}

export function resetDatabaseConnection(): void {
  databasePromise = undefined;
}

export function setDatabaseForTesting(db: DatabaseLike | undefined): void {
  databasePromise = db ? Promise.resolve(db) : undefined;
}

export async function runInTransaction<T>(
  action: (db: DatabaseLike) => Promise<T>,
): Promise<T> {
  const db = await getDatabase();
  await db.execute("BEGIN TRANSACTION;");
  try {
    const result = await action(db);
    await db.execute("COMMIT;");
    return result;
  } catch (error) {
    try {
      await db.execute("ROLLBACK;");
    } catch {
      // Ignore rollback failure if transaction already failed
    }
    throw error;
  }
}
