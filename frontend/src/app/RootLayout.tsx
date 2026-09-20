import { Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';
import Layout from '@/components/Layout/Layout';
import Loader from '@/components/Shared/Loader/Loader';
import { ToastProvider } from '@/providers/ToastProvider';
import { AuthProvider } from '@/providers/AuthProvider';

export function RootLayout() {
  return (
    <ToastProvider position="top-center">
      <AuthProvider>
        <Layout>
          <Suspense fallback={<Loader minHeight="50vh" />}>
            <Outlet />
          </Suspense>
        </Layout>
      </AuthProvider>
    </ToastProvider>
  );
}
