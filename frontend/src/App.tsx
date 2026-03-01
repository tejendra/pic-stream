import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { StoredAlbumToken } from 'shared'
import { isTokenExpired } from './api/client'
import { getRecentAlbums } from './lib/recentAlbums'
import CreateAlbumPage from './pages/CreateAlbumPage'
import OpenAlbumPage from './pages/OpenAlbumPage'
import AlbumPage from './pages/AlbumPage'
import './App.css'

const theme = createTheme()

const ALBUM_STORAGE_PREFIX = 'album_'

function Home() {
  const navigate = useNavigate()
  const recentAlbums = getRecentAlbums()
  const [expiredAlbumId, setExpiredAlbumId] = useState<string | null>(null)

  const handleAlbumClick = (albumId: string) => {
    const raw = localStorage.getItem(ALBUM_STORAGE_PREFIX + albumId)
    if (!raw) {
      setExpiredAlbumId(albumId)
      return
    }
    let stored: StoredAlbumToken
    try {
      stored = JSON.parse(raw) as StoredAlbumToken
    } catch {
      setExpiredAlbumId(albumId)
      return
    }
    if (isTokenExpired(stored.token)) {
      setExpiredAlbumId(albumId)
      return
    }
    setExpiredAlbumId(null)
    navigate(`/album/${albumId}`)
  }

  return (
    <Box sx={{ p: 2, maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Pic Stream
      </Typography>
      {recentAlbums.length > 0 && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Recent albums
        </Typography>
      )}
      <List disablePadding>
        {recentAlbums.map((album) => (
          <Box key={album.albumId}>
            <ListItemButton
              onClick={() => handleAlbumClick(album.albumId)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemText primary={album.name || 'Untitled'} secondary={album.albumId} />
            </ListItemButton>
            {expiredAlbumId === album.albumId && (
              <Typography variant="body2" color="error" sx={{ pl: 2, pb: 1 }}>
                Token missing or expired.{' '}
                <Link to="/open">Re-enter seed</Link>
              </Typography>
            )}
          </Box>
        ))}
      </List>
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
        <Button component={Link} to="/create" variant="contained" size="large">
          Create album
        </Button>
        <Button component={Link} to="/open" variant="outlined" size="large">
          Open album
        </Button>
      </Stack>
    </Box>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateAlbumPage />} />
          <Route path="/open" element={<OpenAlbumPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
