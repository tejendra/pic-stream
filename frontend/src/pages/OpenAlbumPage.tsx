import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { BIP39_WORDS } from '../lib/bip39-words'
import { addToRecentAlbums } from '../lib/recentAlbums'
import { getAlbum, openAlbum } from '../api/client'

const WORD_COUNT = 5
const BIP39_OPTIONS = [...BIP39_WORDS]

export default function OpenAlbumPage() {
  const navigate = useNavigate()
  const [words, setWords] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ])
  const [error, setError] = useState<string | null>(null)

  const setWord = (index: number, value: string | null) => {
    setWords((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const seed = words.filter(Boolean).join(' ').trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (words.some((w) => !w)) {
      setError('Select all 5 words')
      return
    }
    try {
      const { token, albumId } = await openAlbum(seed)
      const key = `album_${albumId}`
      localStorage.setItem(key, JSON.stringify({ token, albumId }))
      const album = await getAlbum(albumId, token)
      addToRecentAlbums(albumId, album.name)
      navigate(`/album/${albumId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid seed')
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Open album
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose the 5 words from your seed. Type to search or pick from the list to avoid typos.
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {Array.from({ length: WORD_COUNT }, (_, i) => (
              <Autocomplete
                key={i}
                options={BIP39_OPTIONS}
                value={words[i]}
                onChange={(_e, v) => setWord(i, v)}
                getOptionLabel={(opt) => opt ?? ''}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Word ${i + 1}`}
                    placeholder="Type or select"
                    autoComplete="on"
                  />
                )}
                disableClearable={false}
                autoSelect
                autoHighlight
              />
            ))}
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={words.some((w) => !w)}
            >
              Open album
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
