import { Button, Container, Stack, TextField, Typography, Box, Paper } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';

function App() {
  const [name, setName] = useState('');
  let navigate = useNavigate();

  const joinAlbum = (albumName: string) => {
    console.log('Opening ', albumName);
    navigate(`/albums/${albumName}`);
  };

  const createAlbum = (albumName: string) => {
    console.log('Creating ', albumName);
    navigate(`/albums/${albumName}`);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F8F9F7 0%, #E9ECE9 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={0}>
          <Stack spacing={4} alignItems="center">
            <Box sx={{ textAlign: 'center' }}>
              <PhotoLibraryIcon sx={{ fontSize: 48, color: 'brand.main', mb: 2 }} />
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  mb: 1,
                  background: 'linear-gradient(45deg, #4A8B7C 30%, #6BAE9E 90%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                }}
              >
                Pic Stream
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Share your moments with your friends and family
              </Typography>
            </Box>

            <TextField
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter album name"
            />

            <Stack
              direction="row"
              spacing={2}
              width="100%"
              alignItems="center"
              sx={{ '& > button': { height: '40px' } }}
            >
              <Button
                fullWidth
                variant="contained"
                onClick={() => joinAlbum(name)}
                disabled={!name}
              >
                Join Album
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => createAlbum(name)}
                disabled={!name}
              >
                Create Album
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default App;
