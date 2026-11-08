# AI YouTube Studio — Product Requirements

## Product goal

Build a Windows desktop studio that takes a creator from a video topic through research, script, storyboard, voice, visuals, subtitles, edit, thumbnail, SEO, human approval, and verified YouTube upload.

The attached Master PRD remains the detailed source of truth. This file records the implementation baseline and current scope.

## MVP principles

- Native Windows desktop app using Tauri 2, React, TypeScript, Rust, and SQLite.
- Free-first, provider-independent AI integrations; paid services are opt-in.
- Keep project data local by default and credentials out of ordinary database fields.
- Make production state and errors visible; preserve completed work and support recovery.
- Never display fabricated research, generated media, rendering, or upload results.
- Require human approval before YouTube publishing.
- Prioritize technology and AI tutorials in English, Roman Urdu, and Urdu.

## MVP workflow

Project → topic research → outline and script → review → scenes → voice and visuals → subtitles → video render → thumbnail and SEO → final review → user approval → YouTube upload → upload verification.

Every phase must persist its outputs and recover from safe-to-retry failures. Provider adapters must keep vendor-specific behavior outside the UI.

## Implementation phases

0. Repository, architecture, toolchain, database, build, and test preparation.
1. Dashboard, project management, settings, media library, and persistence.
2. Provider configuration, research, script generation, editing, and versions.
3. Storyboard, scenes, asset import, and visual providers.
4. Voice providers, audio export, transcription, and subtitles.
5. FFmpeg-based editing, preview, export, and render recovery.
6. Thumbnail and SEO generation and editing.
7. OAuth, channel management, approval, private upload, and verification.
8. Integration/security/performance QA, installer, and release documentation.

## Acceptance direction

The MVP is complete only when a user can create a project, produce and review a playable video with its supporting assets and metadata, explicitly approve publication, upload privately to an authorized channel, and verify the resulting YouTube video ID. A collection of screens alone is not completion.

## Current scope boundary

Only the desktop shell, project dashboard, SQLite-backed project CRUD, and initial validation tests have been started. No AI, media, OAuth, or upload result is currently represented as functional.
