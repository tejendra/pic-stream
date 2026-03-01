# API curl examples

Backend runs at `http://localhost:3001` by default. Use these commands to test endpoints.

## Health

```bash
curl -s http://localhost:3001/api/health
```

## Firebase status

```bash
curl -s http://localhost:3001/api/firebase-status
```

## Create album

**POST** `/api/albums` – body: `{ name, deleteOn, createdBy }`. Returns `201` with `{ albumId, seed, token }`.

```bash
curl -X POST http://localhost:3001/api/albums \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","deleteOn":"2025-12-31","createdBy":"Me"}'
```

## Open album

**POST** `/api/albums/open` – body: `{ seed: string }`. Returns `200` with `{ token }` (JWT, creator: false) or `401` if seed does not match any album.

```bash
curl -X POST http://localhost:3001/api/albums/open \
  -H "Content-Type: application/json" \
  -d '{"seed":"your five word seed here"}'
```

Use the `seed` value returned when you created the album.

---

*More endpoints (GET album, upload, media, etc.) will be added here as they are implemented.*
