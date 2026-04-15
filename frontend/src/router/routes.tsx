import Login from '@/views/login';
import Chat from '@/views/chat';
import NotFound from '@/views/error/notFound';
import { Navigate, type RouteObject } from 'react-router-dom';

export const staticRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/',
    children: [
      {
        path: 'chat/:sessionId?',
        element: <Chat />
      },
      {
        path: 'error',
        children: [
          {
            path: 'notFound',
            element: <NotFound />
          }
        ]
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/error/notFound" replace />
  }
];
