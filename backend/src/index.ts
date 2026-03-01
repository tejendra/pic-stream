import express from 'express'
import { config, isFirebaseConfigured } from './config.js'
import { readDoc, writeDoc } from './lib/firestore.js'
import { getSignedDownloadUrl } from './lib/storage.js'

const app = express()

app.use(express.json())

app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', config.corsOrigin)
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})

app.options('*', (_req, res) => res.sendStatus(204))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/firebase-status', async (_req, res) => {
  if (!isFirebaseConfigured) {
    return res.json({ configured: false })
  }
  try {
    const testId = `status-${Date.now()}`
    await writeDoc('_firebase_status', testId, { at: new Date().toISOString() })
    const read = await readDoc('_firebase_status', testId)
    const signedUrl = await getSignedDownloadUrl('_status/test.txt')
    res.json({
      configured: true,
      firestore: Boolean(read),
      signedUrlGenerated: Boolean(signedUrl),
    })
  } catch (err) {
    res.status(503).json({
      configured: true,
      error: err instanceof Error ? err.message : 'Firebase error',
    })
  }
})

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`)
})
