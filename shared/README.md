# shared

Shared types and utilities for backend and frontend. Single source of truth for API/Firestore types and common logic.

## Usage

- **Types**: `import type { Album, Media, CreateAlbumRequest, ... } from 'shared'`
- **Utils** (when added): `import { someUtil } from 'shared'`

## Adding util functions

1. Add a new file, e.g. `utils.ts`, and export your functions.
2. In `index.ts`, add: `export * from './utils.js'`
3. Run `npm run build` in this directory (required so backend Node runtime and frontend resolve the compiled output).
4. Backend and frontend can then `import { yourUtil } from 'shared'`.

## Build

Run `npm run build` in `shared/` after changing types or utils. Backend and frontend depend on `dist/`; if you use a root-level or workspace build script, build shared first.
