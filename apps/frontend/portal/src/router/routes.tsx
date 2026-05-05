import Login from '@/views/login';
import Chat from '@/views/chat';
import NotFound from '@/views/error/notFound';
import { Navigate, redirect, type RouteObject } from 'react-router-dom';
import { useUserStore } from '@/store/user';

const isLogin = () => !!useUserStore.getState().token;

export const staticRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
    loader: () => {
      if (isLogin()) {
        return redirect('/chat');
      }
      return null;
    }
  },
  {
    path: '/',
    loader: () => {
      if (!isLogin()) {
        return redirect('/login');
      }
      return null;
    },
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
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
