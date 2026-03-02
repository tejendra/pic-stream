import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { GetAlbumResponse } from 'shared'
import { deleteAlbum, getAlbum, patchAlbum } from '../api/client'
import { isTokenExpired } from '../api/client'
import { removeFromRecentAlbums } from '../lib/recentAlbums'

const ALBUM_STORAGE_PREFIX = 'album_'

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [album, setAlbum] = useState<GetAlbumResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editDeleteOn, setEditDeleteOn] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    const raw = localStorage.getItem(ALBUM_STORAGE_PREFIX + id)
    if (!raw) {
      setError('Album token missing')
      setLoading(false)
      return
    }
    let token: string
    try {
      const stored = JSON.parse(raw) as { token?: string }
      if (typeof stored?.token !== 'string') {
        setError('Invalid stored token')
        setLoading(false)
        return
      }
      token = stored.token
    } catch {
      setError('Invalid stored token')
      setLoading(false)
      return
    }
    if (isTokenExpired(token)) {
      setError('Token expired')
      setLoading(false)
      return
    }
    getAlbum(id, token)
      .then((data) => {
        setAlbum(data)
        setEditDeleteOn(data.deleteOn || '')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load album')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleEditSave = () => {
    if (!id || !album) return
    const raw = localStorage.getItem(ALBUM_STORAGE_PREFIX + id)
    if (!raw) return
    let token: string
    try {
      const stored = JSON.parse(raw) as { token?: string }
      token = (stored?.token as string) || ''
    } catch {
      return
    }
    setSaving(true)
    patchAlbum(id, token, { deleteOn: editDeleteOn })
      .then((updated) => {
        setAlbum(updated)
        setEditOpen(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Update failed')
      })
      .finally(() => setSaving(false))
  }

  const handleDeleteConfirm = () => {
    if (!id) return
    const raw = localStorage.getItem(ALBUM_STORAGE_PREFIX + id)
    if (!raw) return
    let token: string
    try {
      const stored = JSON.parse(raw) as { token?: string }
      token = (stored?.token as string) || ''
    } catch {
      return
    }
    setSaving(true)
    deleteAlbum(id, token)
      .then(() => {
        removeFromRecentAlbums(id)
        localStorage.removeItem(ALBUM_STORAGE_PREFIX + id)
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Delete failed')
      })
      .finally(() => {
        setSaving(false)
        setDeleteConfirmOpen(false)
      })
  }

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    )
  }
  if (error && !album) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
        <Button sx={{ mt: 1 }} onClick={() => navigate('/')}>
          Back to home
        </Button>
      </Box>
    )
  }
  if (!album) {
    return null
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">{album.name || 'Untitled'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Delete on: {album.deleteOn || '—'}
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={() => setEditOpen(true)} disabled={saving}>
          Edit delete date
        </Button>
        <Button variant="outlined" color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={saving}>
          Delete album
        </Button>
      </Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)}>
        <DialogTitle>Edit delete date</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Delete on"
            type="date"
            value={editDeleteOn}
            onChange={(e) => setEditDeleteOn(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => !saving && setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete album</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete entire album? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
