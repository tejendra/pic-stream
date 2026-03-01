# Storage path layout

All Firebase Storage paths used by Pic Stream live under `albums/{albumId}/`. Paths are built and validated by the backend path helper (`backend/src/lib/paths.ts`).

## Path patterns

| Purpose   | Pattern                                                                 |
|-----------|-------------------------------------------------------------------------|
| Original  | `albums/{albumId}/originals/{uniqueId}_{sanitizedFilename}`             |
| Preview   | `albums/{albumId}/previews/{uniqueId}_{sanitizedFilename}`               |
| Thumbnail | `albums/{albumId}/thumbnails/{uniqueId}.jpg`                             |

- **albumId**: Album document ID (safe segment: no `..`, only `[a-zA-Z0-9._-]`).
- **uniqueId**: Unique per-file id (e.g. nanoid); same character rules.
- **sanitizedFilename**: Basename with only `[a-zA-Z0-9._-]` allowed; no path separators or `..`.

Total path length is limited to 200 characters. Any segment containing `..` is rejected.
