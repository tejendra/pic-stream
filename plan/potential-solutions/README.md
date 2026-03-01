# Potential solutions for Pic Stream

Two implementation options that meet the product decisions (Express backend, Firebase, free tier, 5-word seed, 25-file batch, duplicate detection, large video support).

| Aspect | Solution A – Express-centric | Solution B – Firebase Functions |
|--------|------------------------------|----------------------------------|
| **Backend** | Express does all logic (auth, signed URLs, validation, register file, duplicate check) | Express: auth + signed URLs only. Cloud Functions: validation, thumbnail, duplicate, scheduled delete |
| **Thumbnails** | v1: client-generated for images; video = placeholder | Server-side in `onStorageFinalize` (image resize + video frame) |
| **Duplicate detection** | v1: filename + size (in Express before issuing URL) | Content hash in Cloud Function after upload |
| **Scheduled delete** | Cron/Cloud Scheduler calls Express endpoint | Cloud Function on schedule |
| **Complexity** | One codebase, one place to debug | Split between Express and Functions; more moving parts |
| **Best for** | Simpler ops, single deploy, clear ownership of security | Firebase-native, server-side thumbnails and hash-based dedup from day one |

**Recommendation:** Start with **Solution A** for v1 (ship faster, one backend). Add a single Cloud Function for scheduled delete if you prefer not to run a cron against Express. Move to B-style (onFinalize for thumbnail + hash) later if you want server-side thumbnails and stronger duplicate detection without changing the rest of the app.
