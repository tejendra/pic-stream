# Firestore schema

Collections and subcollections used by Pic Stream. Indexes are defined in `firestore.indexes.json`.

## Collection: `albums`

Top-level collection. One document per album.

| Field       | Type   | Description                          |
|------------|--------|--------------------------------------|
| id         | string | Document ID (album ID)               |
| name       | string | Album name                           |
| seedHash   | string | bcrypt hash of the 5-word seed       |
| deleteOn   | string | ISO date when album should be deleted |
| createdAt  | string | ISO timestamp when created          |
| createdBy  | string | Display name of creator             |

**Index:** `deleteOn` ascending (for cron: query albums where deleteOn ≤ today).

---

## Subcollection: `albums/{albumId}/media`

One document per media item in an album.

| Field         | Type   | Description                                |
|---------------|--------|--------------------------------------------|
| id            | string | Document ID (media ID)                     |
| albumId       | string | Parent album ID (for collection-group index) |
| storagePath   | string | Storage path to original file              |
| previewPath   | string \| null | Storage path to preview (null until processed) |
| thumbnailPath | string | Storage path to thumbnail                  |
| displayName   | string | Original or chosen display filename       |
| uploaderName  | string | Display name of uploader                  |
| size          | number | File size in bytes                        |
| mimeType      | string | MIME type                                 |
| duplicateKey  | string | e.g. `filename|size` for duplicate detection |
| createdAt     | string | ISO timestamp when created                |

**Index:** `albumId` ascending + `createdAt` ascending (collection-group queries).
