import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { staticRoutes } from './routes';

const routes = createBrowserRouter(staticRoutes);

export default function Router() {
  return <RouterProvider router={routes} />;
}
