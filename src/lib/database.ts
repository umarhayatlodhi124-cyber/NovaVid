import Database from "@tauri-apps/plugin-sql";

const DATABASE_URL = "sqlite:ai_youtube_studio.db";
let databasePromise: Promise<Database> | undefined;

export function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL).catch((error: unknown) => {
      databasePromise = undefined;
      throw new Error(
        error instanceof Error ? error.message : "The local project database could not be opened.",
      );
    });
  }
  return databasePromise;
}

export function resetDatabaseConnection(): void {
  databasePromise = undefined;
}

export function setDatabaseForTesting(db: Database | undefined): void {
  databasePromise = db ? Promise.resolve(db) : undefined;
}

export async function runInTransaction<T>(
  action: (db: Database) => Promise<T>,
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
