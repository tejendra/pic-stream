import express from 'express'
import { config } from './config.js'

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

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`)
})
