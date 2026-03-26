import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { GetAlbumResponse, PrepareUploadItem } from 'shared'

/** Duplicate file info from prepare response (filename + size). */
type PrepareDuplicate = { filename: string; size: number }
import { deleteAlbum, finalizeUpload, getAlbum, patchAlbum, prepareUpload, uploadFileToSignedUrl } from '../api/client'
import { isTokenExpired } from '../api/client'
import { removeFromRecentAlbums } from '../lib/recentAlbums'

const MAX_UPLOAD_FILES = 25
const ACCEPT_UPLOAD = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm'

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
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploaderName, setUploaderName] = useState('')
  const [uploadProgress, setUploadProgress] = useState<Record<string, { loaded: number; total: number }>>({})
  const [uploadDuplicates, setUploadDuplicates] = useState<PrepareDuplicate[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const getToken = useCallback((): string | null => {
    if (!id) return null
    const raw = localStorage.getItem(ALBUM_STORAGE_PREFIX + id)
    if (!raw) return null
    try {
      const stored = JSON.parse(raw) as { token?: string }
      return typeof stored?.token === 'string' ? stored.token : null
    } catch {
      return null
    }
  }, [id])

  const handleDeleteConfirm = () => {
    const token = getToken()
    if (!id || !token) return
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

  const handleUploadClick = () => {
    setUploadError(null)
    setUploadDuplicates([])
    setUploadProgress({})
    setUploadOpen(true)
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = getToken()
    if (!id || !token || !e.target.files?.length) return
    const fileList = Array.from(e.target.files)
    if (fileList.length > MAX_UPLOAD_FILES) {
      setUploadError(`Maximum ${MAX_UPLOAD_FILES} files at once`)
      e.target.value = ''
      return
    }
    setUploading(true)
    setUploadError(null)
    setUploadDuplicates([])
    setUploadProgress({})
    try {
      const filesMeta = fileList.map((f) => ({
        filename: f.name,
        size: f.size,
        mimeType: f.type || 'application/octet-stream',
      }))
      const { uploads, duplicates } = await prepareUpload(id, token, filesMeta)
      setUploadDuplicates(duplicates)
      const isDuplicate = (name: string, size: number) =>
        duplicates.some((d) => d.filename === name && d.size === size)
      const filesToUpload = fileList.filter((f) => !isDuplicate(f.name, f.size))
      for (let i = 0; i < uploads.length; i++) {
        const item = uploads[i] as PrepareUploadItem
        const file = filesToUpload[i]
        if (!file) continue
        setUploadProgress((prev) => ({ ...prev, [item.uploadId]: { loaded: 0, total: file.size } }))
        await uploadFileToSignedUrl(item.signedUploadUrl, file, item.mimeType, (loaded, total) => {
          setUploadProgress((prev) => ({ ...prev, [item.uploadId]: { loaded, total } }))
        })
      }
      if (uploads.length === 0) {
        setUploading(false)
        e.target.value = ''
        return
      }
      await finalizeUpload(id, token, {
        uploads: uploads.map((u, i) => ({
          uploadId: u.uploadId,
          storagePath: u.storagePath,
          uploaderName: uploaderName.trim() || 'Anonymous',
          displayName: filesToUpload[i]?.name,
        })),
      })
      setUploadOpen(false)
      setUploadProgress({})
      setUploadDuplicates([])
      e.target.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
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
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={handleUploadClick} disabled={saving || uploading}>
          Upload
        </Button>
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

      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload to album</DialogTitle>
        <DialogContent>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_UPLOAD}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <TextField
            autoFocus
            margin="dense"
            label="Your name (optional)"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            fullWidth
            placeholder="Anonymous"
            disabled={uploading}
          />
          <Button
            variant="outlined"
            component="span"
            sx={{ mt: 2 }}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose files (max {MAX_UPLOAD_FILES})
          </Button>
          {uploadDuplicates.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already in album:
              </Typography>
              <List dense disablePadding>
                {uploadDuplicates.map((d) => (
                  <ListItem key={`${d.filename}-${d.size}`} disablePadding>
                    <ListItemText primary={d.filename} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          {uploadError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {uploadError}
            </Typography>
          )}
          {Object.keys(uploadProgress).length > 0 && (
            <Box sx={{ mt: 2 }}>
              {Object.entries(uploadProgress).map(([uploadId, { loaded, total }]) => (
                <Box key={uploadId} sx={{ mb: 1 }}>
                  <LinearProgress
                    variant={total ? 'determinate' : 'indeterminate'}
                    value={total ? Math.round((loaded / total) * 100) : 0}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
