import { createBrowserRouter } from 'react-router-dom';
import App from './pages/App.tsx';
import Album from './pages/Album.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/albums/:name',
    element: <Album />,
  },
]);

export default router;
