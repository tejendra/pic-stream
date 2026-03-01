import { Link } from 'react-router-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CreateAlbumPage from './pages/CreateAlbumPage'
import OpenAlbumPage from './pages/OpenAlbumPage'
import AlbumPage from './pages/AlbumPage'
import './App.css'

const theme = createTheme()

function Home() {
  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Pic Stream
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
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
