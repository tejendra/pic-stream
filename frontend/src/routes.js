import {
  createBrowserRouter,
} from "react-router-dom";
import App from './pages/App';
import Album from './pages/Album';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />
  },
  {
    path: "/albums/:name",
    element: <Album/>
  }
]);

export default router;