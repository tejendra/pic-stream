import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getRecentAlbums, LANDING_FLASH_SESSION_KEY } from './lib/recentAlbums'
import CreateAlbumPage from './pages/CreateAlbumPage'
import OpenAlbumPage from './pages/OpenAlbumPage'
import AlbumPage from './pages/AlbumPage'
import './App.css'

const theme = createTheme()

function Home() {
  const navigate = useNavigate()
  const recentAlbums = getRecentAlbums()
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const msg = sessionStorage.getItem(LANDING_FLASH_SESSION_KEY)
    if (msg) {
      sessionStorage.removeItem(LANDING_FLASH_SESSION_KEY)
      setFlash(msg)
    }
  }, [])

  return (
    <Box sx={{ p: 2, maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Pic Stream
      </Typography>
      {flash ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setFlash(null)}>
          {flash}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
        <Button component={Link} to="/create" variant="contained" size="large">
          Create album
        </Button>
        <Button component={Link} to="/open" variant="outlined" size="large">
          Open album
        </Button>
      </Stack>
      {recentAlbums.length > 0 ? (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Recent albums
        </Typography>
      ) : null}
      <List disablePadding>
        {recentAlbums.map((album) => {
          const label =
            album.name.trim().length > 0 ? album.name.trim() : `Album ${album.albumId}`
          return (
            <ListItemButton
              key={album.albumId}
              onClick={() => navigate(`/album/${album.albumId}`)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemText primary={label} secondary={album.albumId} />
            </ListItemButton>
          )
        })}
      </List>
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
          <Route path="/album/:albumId" element={<AlbumPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
