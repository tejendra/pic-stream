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

## Get album (requires JWT)

**GET** `/api/albums/:id` – requires `Authorization: Bearer <token>` and token must have `albumId` equal to `:id`. Returns `200` with album details or `401` if missing/invalid token or mismatch.

```bash
# Replace ALBUM_ID and TOKEN with values from create or open response
curl -s http://localhost:3001/api/albums/ALBUM_ID -H "Authorization: Bearer TOKEN"
```

Without token or with wrong album id you get `401`.

---

*More endpoints (upload, media, etc.) will be added here as they are implemented.*
