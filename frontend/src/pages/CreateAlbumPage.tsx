import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createAlbum } from '../api/client'
import type { CreateAlbumResponse } from 'shared'

const DEFAULT_DELETE_ON = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
})()

export default function CreateAlbumPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [deleteOn, setDeleteOn] = useState(DEFAULT_DELETE_ON)
  const [createdBy, setCreatedBy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateAlbumResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const data = await createAlbum({ name, deleteOn, createdBy })
      setResult(data)
      const key = `album_${data.albumId}`
      localStorage.setItem(key, JSON.stringify({ token: data.token, albumId: data.albumId }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create album failed')
    }
  }

  const copySeed = () => {
    if (!result?.seed) return
    navigator.clipboard.writeText(result.seed)
  }

  const downloadSeed = () => {
    if (!result?.seed) return
    const safeName = name.replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, '-').trim() || result.albumId
    const blob = new Blob([result.seed], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pic-stream-seed-${safeName}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (result) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', p: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Save this seed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You need this 5-word seed to open the album later. Store it somewhere safe.
          </Typography>
          <Typography
            component="pre"
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {result.seed}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={copySeed}>
              Copy
            </Button>
            <Button variant="outlined" onClick={downloadSeed}>
              Download
            </Button>
            <Button variant="contained" color="primary" onClick={() => navigate(`/album/${result.albumId}`)}>
              Go to album
            </Button>
          </Stack>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create album
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Album name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Delete on"
              type="date"
              value={deleteOn}
              onChange={(e) => setDeleteOn(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Your name"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              required
              fullWidth
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Button type="submit" variant="contained" size="large" fullWidth>
              Create album
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
