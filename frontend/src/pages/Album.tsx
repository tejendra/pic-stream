import {
  Button,
  Card,
  CardActions,
  CardMedia,
  Container,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  useGetAlbumByNameQuery,
  useUploadToAlbumMutation,
} from '../services/album';
import { Download } from '@mui/icons-material';
import { ChangeEvent } from 'react';

function Album() {
  let { name } = useParams();
  const { data, error, isLoading } = useGetAlbumByNameQuery(name);
  const [createAlbumMedia, result] = useUploadToAlbumMutation();

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    console.log('Uploading');
    createAlbumMedia({ name, files: e.target.files })
      .then(() => console.log('Upload done'))
      .catch((error) => console.error(error))
      .finally(() => console.log(result));
  };

  const handleDownload = () => {
    console.log('Downloading');
  };

  if (error) {
    return (
      <Container maxWidth="md">
        <Typography variant="body1">Error loading album</Typography>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Typography variant="body1">Loading album</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h1" sx={{ mb: 3 }}>
        {data?.albumName}
      </Typography>
      <Stack gap={2} flexDirection="row" sx={{ mb: 3 }}>
        <Button component="label" role={undefined}>
          Upload files
          <input
            style={{ display: 'none' }}
            type="file"
            name="file"
            onChange={(event) => {
              console.log(event.target.files);
              handleUpload(event);
            }}
            multiple
          />
        </Button>
        <Button onClick={() => handleDownload()}>Download All</Button>
      </Stack>
      <Stack direction="row" gap={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {data.media.map((media: { signedUrl: string; key: string }) => {
          return (
            <Card sx={{ maxWidth: 250 }} key={media.key}>
              <CardMedia
                height="250"
                width="250"
                component="img"
                image={media.signedUrl}
                alt={media.key}
              />
              <CardActions>
                <IconButton aria-label="add to favorites">
                  <Download />
                </IconButton>
              </CardActions>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}

export default Album;
