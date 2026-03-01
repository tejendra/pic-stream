import { useParams } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

/**
 * Placeholder for album view. Full implementation in later work items.
 */
export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Album {id}</Typography>
      <Typography variant="body2" color="text.secondary">
        Album page content will be implemented in a later work item.
      </Typography>
    </Box>
  )
}
