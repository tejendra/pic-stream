import { Link } from 'react-router-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CreateAlbumPage from './pages/CreateAlbumPage'
import AlbumPage from './pages/AlbumPage'
import './App.css'

const theme = createTheme()

function Home() {
  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Pic Stream
      </Typography>
      <Button component={Link} to="/create" variant="contained" size="large">
        Create album
      </Button>
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
          <Route path="/album/:id" element={<AlbumPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
