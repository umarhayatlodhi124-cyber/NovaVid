# Architecture

## Runtime

- **Desktop shell:** Tauri 2 with a Windows webview.
- **Frontend:** React + TypeScript built by Vite.
- **Backend:** Rust under `src-tauri`.
- **Local persistence:** SQLite in the Tauri application configuration directory, initialized with registered Rust migrations.

## Current project-data path

The dashboard and project screens call the project repository in `src/lib/projects.ts`. The repository uses Tauri's SQLite plugin and parameterized SQL for project reads and writes. Rust registers the plugin and the initial schema migration; the UI has no browser-storage fallback for projects. Most Phase 2/3 production data is still stored in `localStorage`, however, and is not project-scoped or durable native production persistence.

The `projects` table is versioned through migrations in `src-tauri/migrations`. New project records begin in `draft`; status changes will be owned by later workflow features.

## Intended boundaries

- Keep business logic and provider-specific behavior out of React components.
- Add provider adapters for research, LLM, TTS, image, and stock-media services.
- Run long-running render/provider tasks outside the UI thread and report progress through Tauri events.
- Persist production state and stage outputs so interrupted work can resume safely.
- Keep credentials in operating-system secure storage rather than project rows or logs.
- Restrict filesystem and shell access to explicit, validated operations.

## Audit findings

- The Tauri backend registers application commands for provider credentials, Gemini generation/testing, and request cancellation. Provider commands use Windows Credential Manager and a native HTTP client; this code has not been compiled or runtime-verified yet.
- The frontend provider adapter uses typed `invoke` calls and does not contain Gemini network requests or a persistent API-key field. Legacy stored provider keys are removed when configuration is loaded.
- Production workflows and metadata other than projects still use `localStorage`; project-scoped SQLite migrations and safe data migration are pending.
- Native media file selection/copy, project workspace management, and import metadata extraction remain unimplemented.
- Image generation is an unavailable adapter stub; model-name matching is not provider capability discovery.
- Media imports currently save metadata only. There is no native project workspace import, thumbnail pipeline, FFmpeg/FFprobe integration, or missing-file recovery.
- The navigation and workflow are incomplete; voice, subtitle, timeline, render, thumbnail, SEO, YouTube, analytics, diagnostics, and recovery modules are not implemented.
- See [AUDIT_REPORT.md](./AUDIT_REPORT.md) for the full baseline and staged roadmap.

## Current limitations

Rust/Cargo is not installed in the current environment. The frontend build is verified, but Rust tests, native credential operations, SQLite migration startup, and Windows desktop build remain unverified. See [README.md](./README.md) for Windows setup instructions.
