import { mkdtemp, rm } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { ensureFirebase } from './lib/firebase.js'
import { getFirestore, readMediaDoc } from './lib/firestore.js'
import { downloadFileToPath, uploadLocalFile, deleteFile } from './lib/storage.js'
import { transcodePreview, buildThumbnailArgs, runFfmpeg } from './lib/ffmpeg.js'
import { buildStoragePath } from './lib/paths.js'
import { config, isFirebaseConfigured } from './config.js'

const POLL_MS = 3000

interface JobDoc {
  id: string
  albumId: string
  mediaId: string
  status: string
  createdAt: string
  updatedAt: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function claimNextJob(): Promise<{ id: string; data: JobDoc } | null> {
  const db = getFirestore()
  if (!db) return null
  const pending = await db
    .collection('jobs')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()
  if (pending.empty) return null
  const doc = pending.docs[0]
  const now = new Date().toISOString()
  const result = await db.runTransaction(async (t) => {
    const s = await t.get(doc.ref)
    const d = s.data()
    if (!d || d.status !== 'pending') return null
    t.update(doc.ref, { status: 'processing', updatedAt: now })
    return { id: doc.id, data: d as JobDoc }
  })
  return result ?? null
}

async function processJob(job: { id: string; data: JobDoc }): Promise<void> {
  const { albumId, mediaId } = job.data
  const media = await readMediaDoc(albumId, mediaId)
  if (!media) {
    throw new Error(`Media not found: ${albumId}/${mediaId}`)
  }

  const previewDest = buildStoragePath(albumId, 'previews', mediaId, 'preview.mp4')
  const thumbnailDest = buildStoragePath(albumId, 'thumbnails', mediaId)
  if (!previewDest || !thumbnailDest) {
    throw new Error('Invalid storage paths for album/media ids')
  }

  const ext = extname(media.storagePath) || '.mp4'
  const workDir = await mkdtemp(join(tmpdir(), 'pic-stream-vid-'))
  const inputPath = join(workDir, `input${ext}`)
  const previewLocal = join(workDir, 'preview.mp4')
  const thumbnailLocal = join(workDir, 'thumb.jpg')

  try {
    await downloadFileToPath(media.storagePath, inputPath)
    await transcodePreview(inputPath, previewLocal)
    await runFfmpeg(buildThumbnailArgs(inputPath, thumbnailLocal))

    await uploadLocalFile(previewLocal, previewDest, 'video/mp4')
    await uploadLocalFile(thumbnailLocal, thumbnailDest, 'image/jpeg')

    const db = getFirestore()
    if (!db) throw new Error('Firestore unavailable')
    const now = new Date().toISOString()
    const batch = db.batch()
    const mediaRef = db.collection('albums').doc(albumId).collection('media').doc(mediaId)
    const jobRef = db.collection('jobs').doc(job.id)
    batch.update(mediaRef, { previewPath: previewDest, thumbnailPath: thumbnailDest })
    batch.update(jobRef, { status: 'done', updatedAt: now })
    await batch.commit()
  } catch (err) {
    await deleteFile(previewDest).catch(() => {})
    await deleteFile(thumbnailDest).catch(() => {})
    throw err
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function failJob(jobId: string): Promise<void> {
  const db = getFirestore()
  if (!db) return
  const now = new Date().toISOString()
  await db.collection('jobs').doc(jobId).update({ status: 'failed', updatedAt: now })
}

async function main(): Promise<void> {
  if (!isFirebaseConfigured) {
    console.error(
      'Video worker requires GOOGLE_CLOUD_PROJECT and FIREBASE_STORAGE_BUCKET (see backend config)'
    )
    process.exit(1)
  }
  ensureFirebase()
  console.log(`Video worker started (project=${config.firebase.projectId})`)

  for (;;) {
    try {
      const claimed = await claimNextJob()
      if (!claimed) {
        await sleep(POLL_MS)
        continue
      }
      try {
        await processJob(claimed)
      } catch (err) {
        console.error(`Job ${claimed.id} failed:`, err)
        await failJob(claimed.id)
      }
    } catch (err) {
      console.error('Worker loop error:', err)
      await sleep(POLL_MS)
    }
  }
}

main()
