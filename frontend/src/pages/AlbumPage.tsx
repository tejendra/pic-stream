import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import type { GetAlbumResponse, MediaListItem, MediaUrlType, PrepareUploadItem } from 'shared'

/** Duplicate file info from prepare response (filename + size). */
type PrepareDuplicate = { filename: string; size: number }
import {
  albumTokenStorageKey,
  deleteAlbum,
  deleteMedia,
  finalizeUpload,
  getAlbum,
  getMediaSignedUrl,
  getStoredAlbumToken,
  listMedia,
  patchAlbum,
  prepareUpload,
  uploadFileToSignedUrl,
  isTokenExpired,
} from '../api/client'
import { LANDING_FLASH_SESSION_KEY, removeFromRecentAlbums } from '../lib/recentAlbums'

function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

/** Which signed URL to show in the grid cell for this item. */
function gridUrlType(m: MediaListItem): MediaUrlType | 'processing' {
  if (isVideoMime(m.mimeType)) {
    if (m.thumbnailPath) return 'thumbnail'
    if (m.previewPath) return 'preview'
    return 'processing'
  }
  return 'original'
}

const MAX_UPLOAD_FILES = 25
const ACCEPT_UPLOAD = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm'

const SESSION_EXPIRED_LANDING_MESSAGE =
  'Session expired. Re-enter seed to open this album.'

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>()
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
  const [media, setMedia] = useState<MediaListItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [gridUrls, setGridUrls] = useState<Record<string, string>>({})
  const [selectedMedia, setSelectedMedia] = useState<MediaListItem | null>(null)
  const [modalSrc, setModalSrc] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [removeItemTarget, setRemoveItemTarget] = useState<MediaListItem | null>(null)
  const [removeItemBusy, setRemoveItemBusy] = useState(false)

  const loadMedia = useCallback(async () => {
    if (!albumId) return
    const token = getStoredAlbumToken(albumId)
    if (!token) return
    setMediaLoading(true)
    try {
      const { media: items } = await listMedia(albumId)
      setMedia(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media')
    } finally {
      setMediaLoading(false)
    }
  }, [albumId])

  useEffect(() => {
    if (!albumId) return
    const token = getStoredAlbumToken(albumId)
    if (!token || isTokenExpired(token)) {
      sessionStorage.setItem(LANDING_FLASH_SESSION_KEY, SESSION_EXPIRED_LANDING_MESSAGE)
      navigate('/', { replace: true })
      return
    }
    getAlbum(albumId)
      .then((data) => {
        setAlbum(data)
        setEditDeleteOn(data.deleteOn || '')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load album')
      })
      .finally(() => setLoading(false))
  }, [albumId, navigate])

  useEffect(() => {
    if (!albumId || !album) return
    loadMedia()
  }, [albumId, album, loadMedia])

  useEffect(() => {
    if (!albumId || !media.length) {
      setGridUrls({})
      return
    }
    const token = getStoredAlbumToken(albumId)
    if (!token) return
    let cancelled = false
    ;(async () => {
      const next: Record<string, string> = {}
      for (const m of media) {
        const kind = gridUrlType(m)
        if (kind === 'processing') continue
        try {
          const { url } = await getMediaSignedUrl(albumId, m.id, kind)
          next[m.id] = url
        } catch {
          // leave missing; cell shows placeholder
        }
      }
      if (!cancelled) setGridUrls(next)
    })()
    return () => {
      cancelled = true
    }
  }, [albumId, media])

  useEffect(() => {
    if (!selectedMedia || !albumId) {
      setModalSrc(null)
      setModalLoading(false)
      return
    }
    const token = getStoredAlbumToken(albumId)
    if (!token) return
    let cancelled = false
    setModalLoading(true)
    setModalSrc(null)
    const m = selectedMedia
    const kind: MediaUrlType = isVideoMime(m.mimeType)
      ? m.previewPath
        ? 'preview'
        : 'original'
      : 'original'
    ;(async () => {
      try {
        const { url } = await getMediaSignedUrl(albumId, m.id, kind)
        if (!cancelled) setModalSrc(url)
      } catch {
        if (!cancelled) setModalSrc(null)
      } finally {
        if (!cancelled) setModalLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedMedia, albumId])

  const needsVideoPoll = useMemo(
    () => media.some((m) => isVideoMime(m.mimeType) && !m.previewPath),
    [media]
  )

  useEffect(() => {
    if (!albumId || !album) return
    const token = getStoredAlbumToken(albumId)
    if (!token || !needsVideoPoll) return
    const t = setInterval(() => {
      listMedia(albumId)
        .then((r) => setMedia(r.media))
        .catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [albumId, album, needsVideoPoll])

  const handleEditSave = () => {
    if (!albumId || !album) return
    setSaving(true)
    patchAlbum(albumId, { deleteOn: editDeleteOn })
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
    if (!albumId) return
    const token = getStoredAlbumToken(albumId)
    if (!token) return
    setSaving(true)
    deleteAlbum(albumId)
      .then(() => {
        removeFromRecentAlbums(albumId)
        localStorage.removeItem(albumTokenStorageKey(albumId))
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

  const handleDownloadOriginal = async (m: MediaListItem) => {
    if (!albumId) return
    const token = getStoredAlbumToken(albumId)
    if (!token) return
    try {
      const { url } = await getMediaSignedUrl(albumId, m.id, 'original')
      const res = await fetch(url)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = m.displayName || 'download'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const confirmRemoveMedia = async () => {
    if (!albumId || !removeItemTarget) return
    const token = getStoredAlbumToken(albumId)
    if (!token) return
    setRemoveItemBusy(true)
    try {
      await deleteMedia(albumId, removeItemTarget.id)
      if (selectedMedia?.id === removeItemTarget.id) {
        setSelectedMedia(null)
        setModalSrc(null)
      }
      setRemoveItemTarget(null)
      await loadMedia()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setRemoveItemBusy(false)
    }
  }

  const handleUploadClick = () => {
    setUploadError(null)
    setUploadDuplicates([])
    setUploadProgress({})
    setUploadOpen(true)
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!albumId || !e.target.files?.length) return
    const token = getStoredAlbumToken(albumId)
    if (!token) return
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
      const { uploads, duplicates } = await prepareUpload(albumId, filesMeta)
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
      await finalizeUpload(albumId, {
        uploads: uploads.map((u, i) => ({
          uploadId: u.uploadId,
          storagePath: u.storagePath,
          uploaderName: uploaderName.trim() || 'Anonymous',
          displayName: filesToUpload[i]?.name,
        })),
      })
      await loadMedia()
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

      <Typography variant="subtitle1" sx={{ mt: 3 }}>
        Media
      </Typography>
      {mediaLoading && media.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          Loading media…
        </Typography>
      ) : null}
      <Box
        sx={{
          mt: 1.5,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2,
        }}
      >
        {media.map((m) => {
          const processing = gridUrlType(m) === 'processing'
          const src = gridUrls[m.id]
          return (
            <Box
              key={m.id}
              onClick={() => setSelectedMedia(m)}
              sx={{
                cursor: 'pointer',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {processing ? (
                  <Typography color="text.secondary" variant="body2">
                    Processing…
                  </Typography>
                ) : src ? (
                  <Box
                    component="img"
                    src={src}
                    alt={m.displayName}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Loading…
                  </Typography>
                )}
                {isVideoMime(m.mimeType) && !processing && (
                  <Typography
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      color: 'common.white',
                      textShadow: '0 0 4px #000',
                    }}
                    variant="caption"
                  >
                    ▶
                  </Typography>
                )}
              </Box>
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" noWrap title={m.displayName}>
                  {m.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap title={m.uploaderName}>
                  {m.uploaderName}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>
      {media.length === 0 && !mediaLoading ? (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          No media yet. Use Upload to add files.
        </Typography>
      ) : null}

      <Dialog
        open={selectedMedia !== null}
        onClose={() => setSelectedMedia(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedMedia?.displayName ?? 'Media'}</DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {modalLoading && (
            <Typography color="text.secondary" variant="body2">
              Loading…
            </Typography>
          )}
          {!modalLoading && modalSrc && selectedMedia && (
            <>
              {isVideoMime(selectedMedia.mimeType) ? (
                <Box
                  component="video"
                  src={modalSrc}
                  controls
                  playsInline
                  sx={{ maxWidth: '100%', maxHeight: '70vh' }}
                />
              ) : (
                <Box
                  component="img"
                  src={modalSrc}
                  alt={selectedMedia.displayName}
                  sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => selectedMedia && handleDownloadOriginal(selectedMedia)}
                >
                  Download original
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => selectedMedia && setRemoveItemTarget(selectedMedia)}
                >
                  Delete
                </Button>
              </Box>
            </>
          )}
          {!modalLoading && modalSrc === null && selectedMedia && (
            <Typography color="error" variant="body2">
              Could not load media.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMedia(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={removeItemTarget !== null} onClose={() => !removeItemBusy && setRemoveItemTarget(null)}>
        <DialogTitle>Remove item</DialogTitle>
        <DialogContent>
          <DialogContentText>Remove this item?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveItemTarget(null)} disabled={removeItemBusy}>
            Cancel
          </Button>
          <Button onClick={confirmRemoveMedia} color="error" variant="contained" disabled={removeItemBusy}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

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
