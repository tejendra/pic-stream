import { Button, Container, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const [name, setName] = useState('');
  let navigate = useNavigate();
  const joinAlbum = () => {
    console.log('Opening ', name);
    navigate(`/albums/${name}`);
  };

  const createAlbum = (name) => {
    console.log('Creating ', name);
    navigate(`/albums/${name}`);
  }

  return (
    <Container maxWidth='md'>
      <Typography variant='h1' sx={{mb:3}}>Pic Stream</Typography>
      <Stack gap={2}>
      <TextField variant='outlined' value={name} onChange={(e) => setName(e.target.value)}></TextField>
      <Button variant='contained' onClick={() => joinAlbum(name)} disabled={!name}>Join</Button>
      <Button variant='contained' onClick={() => createAlbum(name)} disabled={!name}>Create</Button>
      </Stack>
    </Container>
  );
}

export default App;
