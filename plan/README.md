# Pic Stream

Just got back from an amazing vacation with hundreds of stunning photos? Don't let WhatsApp compress your memories into pixelated mush! This is your go-to app for sharing those crystal-clear vacation pics and videos in their full, glorious original quality with friends and family.

**Use case:** One trip → one album → one share link to 3–5 people. Trip-centric, not long-lived family albums.

## Product decisions

- **Auth:** No login, no email. Per-album access via a 5-word ordered seed (BIP-39) so people can’t use weak passwords. App is public (anyone can open it); security is “you need the seed to open this album.”
- **Hosting:** Self-hosted on Firebase free tier. No email domain → no transactional email (e.g. no “album expiring” emails).
- **Permissions:** Simple, album-scoped. Creator = created the album and can set/change delete date and delete album. Anyone with the seed can view, upload, and delete any content. All content shows the uploader’s name. If someone deletes a file, it’s acceptable—no complex roles.
- **Storage cost control:** Delete date is required so storage doesn’t grow indefinitely. Creator sets delete-on date when creating the album (default e.g. 30 days).
- **Security scope:** Protect the backend from malicious uploads (zip bombs, executables hidden in images, etc.). Assume the app is public and attackers may try to abuse upload/API; validation and limits must be robust.
- **Upload v1:** Up to 25 files per batch, mix of images and videos; videos can be large. Robust upload (e.g. chunked/resumable) so the experience stays simple. Duplicate detection: warn or block if the user is uploading a file that’s already in the album (e.g. same name + size or hash).

## Features

- **High-Quality Uploads**: Upload photos and videos in their original quality without compression. View thumbnails for fast loading; download originals on demand.
- **No login required**: Each album is protected by a 5-word ordered seed (BIP-39). Enter your name once per album so it’s shown next to content you upload.
- **Secure sharing**: Share the album link + seed with 3–5 people (e.g. one trip, one link).
- **Responsive design**: Works on all devices, including mobile.
- **Short-term storage**: Creator sets a delete-on date (e.g. default 30 days). Album and all content are removed from the server after that date to control storage cost.

## Technical Requirements

- **Firebase:** Hosting, database, and storage (self-hosted on free tier).
  - Store thumbnail + original for each item; support images and video.
- **Frontend:** Latest React, TypeScript, Vite.
- **Backend:** Node/Express.
- **Security & validation:** Harden against malicious uploads (zip bombs, executables/hidden payloads in images, etc.). Validate and sanitize all uploads; enforce file type, size, and count limits.
- **Upload:** Multi-file from mobile and desktop.
  - v1: Up to 25 files per batch (images + videos).
  - Large files: chunked/resumable or similar so large videos don’t fail or block the UI.
  - Duplicate detection: detect when the user is uploading a file that already exists in the album (e.g. by hash or name+size) and warn or prevent duplicate.

## User personas and workflows

**Creator** = person who created the album. Can set/change delete date and delete the entire album. Same person can be a “user” (contributor) in another album.

**User** = anyone with the album seed. Can view, upload, and delete any content in the album. No per-file ownership; deleting any file is allowed.

As a **creator**, I want to create a new album

- Navigate to the app → option to create new album
- Enter album name and delete-on date (default e.g. 30 days)
- System shows the 5-word seed (download as image with album name, or copy to clipboard)
- Redirect to album details page

As a **creator**, I want to manage my album

- View existing albums from local storage, or enter 5-word seed to open an album
- On album page: upload files, delete any file, (creator-only) edit delete date or delete album
- Upload: up to 25 files per batch (images + videos); system warns or blocks if I try to upload a file that’s already in the album

As a **user** (someone with the seed), I want to contribute to an album

- Open album with the 5-word seed (or from local storage if I’ve opened it before)
- Enter my name so it appears next to my uploads
- Upload up to 25 files per batch; get warned if a file is already in the album
- Delete any content in the album (e.g. my own or others’)
- Share the album by passing the link + seed to others
