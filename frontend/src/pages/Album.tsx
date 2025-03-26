import {
  Button,
  Card,
  CardActions,
  CardMedia,
  Container,
  IconButton,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  useGetAlbumByNameQuery,
  useUploadToAlbumMutation,
} from '../services/album';
import { Download, CloudUpload, Delete, Warning } from '@mui/icons-material';
import { ChangeEvent, useState, useRef, useEffect } from 'react';

function Album() {
  let { name } = useParams();
  const { data, error, isLoading } = useGetAlbumByNameQuery(name);
  const [createAlbumMedia, result] = useUploadToAlbumMutation();
  const [deleteWarningKey, setDeleteWarningKey] = useState<string | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

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

  const handleDeleteClick = (key: string) => {
    if (deleteWarningKey === key) {
      // Second click - confirm delete
      console.log('Deleting', key);
      setDeleteWarningKey(null);
    } else {
      // First click - show warning
      setDeleteWarningKey(key);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      warningTimeoutRef.current = setTimeout(() => {
        setDeleteWarningKey(null);
      }, 3000);
    }
  };

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `
            linear-gradient(135deg, #F8F9F7 0%, #E9ECE9 100%),
            radial-gradient(circle at 0% 0%, rgba(74, 139, 124, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(139, 192, 179, 0.15) 0%, transparent 50%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%',
          backgroundPosition: '0 0, 0 0, 0 0',
          backgroundAttachment: 'fixed',
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(74, 139, 124, 0.1)',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                mb: 2,
                color: 'text.primary',
              }}
            >
              Album Not Available
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 3,
              }}
            >
              We couldn't load this album at the moment. Please try again later.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{
                color: 'brand.main',
                borderColor: 'rgba(74, 139, 124, 0.2)',
                '&:hover': {
                  borderColor: 'rgba(74, 139, 124, 0.4)',
                  backgroundColor: 'rgba(74, 139, 124, 0.05)',
                }
              }}
            >
              Try Again
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Typography variant="body1" color="text.secondary">Loading album...</Typography>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 4,
        background: `
          linear-gradient(135deg, #F8F9F7 0%, #E9ECE9 100%),
          radial-gradient(circle at 0% 0%, rgba(74, 139, 124, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 100% 100%, rgba(139, 192, 179, 0.15) 0%, transparent 50%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, 0 0, 0 0',
        backgroundAttachment: 'fixed',
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              mb: 4,
              background: 'linear-gradient(45deg, #4A8B7C 30%, #6BAE9E 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              textAlign: 'center',
            }}
          >
            {data?.albumName}
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              mb: 4,
              '& .MuiButton-root': {
                backdropFilter: 'blur(8px)',
                borderColor: 'rgba(74, 139, 124, 0.2)',
                '&:hover': {
                  borderColor: 'rgba(74, 139, 124, 0.4)',
                }
              }
            }}
          >
            <Button
              component="label"
              variant="contained"
              fullWidth
              sx={{
                height: '40px',
                background: 'rgba(74, 139, 124, 0.9)',
                '&:hover': {
                  background: 'rgba(74, 139, 124, 1)',
                }
              }}
            >
              Upload files
              <input
                style={{ display: 'none' }}
                type="file"
                name="file"
                onChange={handleUpload}
                multiple
                accept="image/*"
              />
            </Button>
            <Button
              variant="outlined"
              onClick={handleDownload}
              fullWidth
              sx={{
                height: '40px',
                color: 'brand.main',
                '&:hover': {
                  backgroundColor: 'rgba(74, 139, 124, 0.05)',
                }
              }}
            >
              Download All
            </Button>
          </Stack>
        </Box>

        <Stack
          direction="row"
          gap={2}
          useFlexGap
          sx={{
            flexWrap: 'wrap',
            justifyContent: { sm: 'flex-start', xs: 'center' }
          }}
        >
          {data.media.map((media: { signedUrl: string; key: string }) => {
            return (
              <Card
                key={media.key}
                elevation={0}
                sx={{
                  transition: 'box-shadow 0.2s',
                  p: 0,
                  '&:hover': {
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <CardMedia
                  height="250"
                  width="250"
                  component="img"
                  image={media.signedUrl}
                  alt={media.key}
                  sx={{
                    objectFit: 'cover',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    }
                  }}
                />
                <CardActions sx={{
                  justifyContent: 'space-between',
                  p: 1,
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0, 0, 0, 0.3)',
                }}>
                  <IconButton
                    aria-label="download"
                    size="small"
                    sx={{
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <Download />
                  </IconButton>
                  <IconButton
                    aria-label="delete"
                    size="small"
                    onClick={() => handleDeleteClick(media.key)}
                    sx={{
                      color: deleteWarningKey === media.key ? 'warning.main' : 'white',
                      '&:hover': {
                        backgroundColor: deleteWarningKey === media.key
                          ? 'rgba(255, 167, 38, 0.1)'
                          : 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    {deleteWarningKey === media.key ? <Warning /> : <Delete />}
                  </IconButton>
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}

export default Album;
