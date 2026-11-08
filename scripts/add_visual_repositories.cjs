const fs = require("fs");
const path = require("path");

const repoPath = path.join(__dirname, "..", "src", "lib", "repositories.ts");
let c = fs.readFileSync(repoPath, "utf8");

// Check if import for CharacterProfile and VisualAsset is present
if (!c.includes("CharacterProfile")) {
  c = c.replace(
    'import type { StoryboardDocument, StoryboardScene, VisualStyleProfile } from "./storyboard";',
    'import type { StoryboardDocument, StoryboardScene, VisualStyleProfile } from "./storyboard";\nimport type { CharacterProfile, VisualAsset } from "./visuals";'
  );
}

// Add CharacterProfileRepository and VisualAssetRepository before "// --- Safe Browser Data Migration ---"
const classesToAdd = `
export class CharacterProfileRepository {
  static async saveProfile(profile: CharacterProfile): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      \`INSERT INTO character_profiles (id, project_id, name, role, appearance_attributes, clothing_continuity, reference_image_path, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         role = excluded.role,
         appearance_attributes = excluded.appearance_attributes,
         clothing_continuity = excluded.clothing_continuity,
         reference_image_path = excluded.reference_image_path,
         updated_at = excluded.updated_at;\`,
      [
        profile.id,
        profile.projectId,
        profile.name,
        profile.role,
        profile.appearanceAttributes,
        profile.clothingContinuity,
        profile.referenceImagePath || null,
        profile.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async listProfiles(projectId: string): Promise<CharacterProfile[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      name: string;
      role: string;
      appearance_attributes: string;
      clothing_continuity: string;
      reference_image_path: string | null;
      created_at: string;
      updated_at: string;
    }[]>(
      \`SELECT id, project_id, name, role, appearance_attributes, clothing_continuity, reference_image_path, created_at, updated_at
       FROM character_profiles
       WHERE project_id = $1
       ORDER BY updated_at DESC;\`,
      [projectId],
    );

    return (rows || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      role: r.role,
      appearanceAttributes: r.appearance_attributes,
      clothingContinuity: r.clothing_continuity,
      referenceImagePath: r.reference_image_path || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async deleteProfile(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM character_profiles WHERE id = $1;", [id]);
  }
}

export class VisualAssetRepository {
  static async saveAsset(asset: VisualAsset): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      \`INSERT INTO visual_assets (id, project_id, scene_id, character_id, prompt, negative_prompt, style_preset, aspect_ratio, provider, model, relative_path, original_name, width, height, size_bytes, checksum, motion_preset, is_b_roll, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT(id) DO UPDATE SET
         scene_id = excluded.scene_id,
         character_id = excluded.character_id,
         prompt = excluded.prompt,
         negative_prompt = excluded.negative_prompt,
         style_preset = excluded.style_preset,
         aspect_ratio = excluded.aspect_ratio,
         motion_preset = excluded.motion_preset,
         is_b_roll = excluded.is_b_roll,
         status = excluded.status,
         updated_at = excluded.updated_at;\`,
      [
        asset.id,
        asset.projectId,
        asset.sceneId || null,
        asset.characterId || null,
        asset.prompt,
        asset.negativePrompt || null,
        asset.stylePreset,
        asset.aspectRatio,
        asset.provider,
        asset.model,
        asset.relativePath,
        asset.originalName,
        asset.width,
        asset.height,
        asset.sizeBytes,
        asset.checksum,
        asset.motionPreset,
        asset.isBRoll ? 1 : 0,
        asset.status,
        asset.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  }

  static async listAssets(projectId: string): Promise<VisualAsset[]> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      scene_id: string | null;
      character_id: string | null;
      prompt: string;
      negative_prompt: string | null;
      style_preset: string;
      aspect_ratio: string;
      provider: string;
      model: string;
      relative_path: string;
      original_name: string;
      width: number;
      height: number;
      size_bytes: number;
      checksum: string;
      motion_preset: string;
      is_b_roll: number;
      status: string;
      created_at: string;
      updated_at: string;
    }[]>(
      \`SELECT id, project_id, scene_id, character_id, prompt, negative_prompt, style_preset, aspect_ratio, provider, model, relative_path, original_name, width, height, size_bytes, checksum, motion_preset, is_b_roll, status, created_at, updated_at
       FROM visual_assets
       WHERE project_id = $1
       ORDER BY updated_at DESC;\`,
      [projectId],
    );

    return (rows || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      sceneId: r.scene_id,
      characterId: r.character_id,
      prompt: r.prompt,
      negativePrompt: r.negative_prompt || undefined,
      stylePreset: r.style_preset,
      aspectRatio: r.aspect_ratio as any,
      provider: r.provider as any,
      model: r.model,
      relativePath: r.relative_path,
      originalName: r.original_name,
      width: r.width,
      height: r.height,
      sizeBytes: r.size_bytes,
      checksum: r.checksum,
      motionPreset: r.motion_preset as any,
      isBRoll: r.is_b_roll === 1,
      status: r.status as any,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async getSceneAsset(projectId: string, sceneId: string): Promise<VisualAsset | null> {
    const db = await getDatabase();
    const rows = await db.select<{
      id: string;
      project_id: string;
      scene_id: string | null;
      character_id: string | null;
      prompt: string;
      negative_prompt: string | null;
      style_preset: string;
      aspect_ratio: string;
      provider: string;
      model: string;
      relative_path: string;
      original_name: string;
      width: number;
      height: number;
      size_bytes: number;
      checksum: string;
      motion_preset: string;
      is_b_roll: number;
      status: string;
      created_at: string;
      updated_at: string;
    }[]>(
      \`SELECT id, project_id, scene_id, character_id, prompt, negative_prompt, style_preset, aspect_ratio, provider, model, relative_path, original_name, width, height, size_bytes, checksum, motion_preset, is_b_roll, status, created_at, updated_at
       FROM visual_assets
       WHERE project_id = $1 AND scene_id = $2
       ORDER BY updated_at DESC
       LIMIT 1;\`,
      [projectId, sceneId],
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      sceneId: r.scene_id,
      characterId: r.character_id,
      prompt: r.prompt,
      negativePrompt: r.negative_prompt || undefined,
      stylePreset: r.style_preset,
      aspectRatio: r.aspect_ratio as any,
      provider: r.provider as any,
      model: r.model,
      relativePath: r.relative_path,
      originalName: r.original_name,
      width: r.width,
      height: r.height,
      sizeBytes: r.size_bytes,
      checksum: r.checksum,
      motionPreset: r.motion_preset as any,
      isBRoll: r.is_b_roll === 1,
      status: r.status as any,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  static async deleteAsset(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM visual_assets WHERE id = $1;", [id]);
  }

  static async assignAssetToScene(assetId: string, sceneId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE visual_assets SET scene_id = $1, updated_at = $2 WHERE id = $3;",
      [sceneId, new Date().toISOString(), assetId]
    );
  }

  static async approveAsset(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      "UPDATE visual_assets SET status = 'approved', updated_at = $1 WHERE id = $2;",
      [new Date().toISOString(), id]
    );
  }
}
`;

if (!c.includes("class VisualAssetRepository")) {
  const insertMarker = "// --- Safe Browser Data Migration ---";
  c = c.replace(insertMarker, `${classesToAdd}\n${insertMarker}`);
  fs.writeFileSync(repoPath, c, "utf8");
  console.log("repositories.ts updated with VisualAssetRepository and CharacterProfileRepository.");
} else {
  console.log("VisualAssetRepository already present.");
}
