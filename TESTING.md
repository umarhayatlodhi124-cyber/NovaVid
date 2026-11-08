# Testing

## Current automated checks

- `npm run build` runs TypeScript checking and a production Vite build.
- `npm test` runs Vitest validation tests for project input normalization and field limits.

## Native checks still required

After Rust and Windows desktop prerequisites are installed:

- Run the Tauri development app and verify the SQLite migration initializes.
- Create, edit, reopen, search, and delete projects; restart the app and confirm persistence.
- Verify database errors are visible and do not result in success-shaped UI.
- Build the Windows application with `npm run tauri build`.

## Later phase coverage

Add focused tests for workflow state transitions, database recovery, provider adapters, asset path validation, media rendering, approval gates, OAuth, and private/resumable YouTube upload. Never run upload tests against public publishing workflows.
