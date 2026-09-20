import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/app/routerContext';
import { validateLibrarySearch } from '@/app/search';
import { currentUserQuery } from '@/features/auth/queries';

export const requireAuth = async ({ context }: { context: RouterContext }) => {
  let user;
  try {
    user = await context.queryClient.ensureQueryData(currentUserQuery());
  } catch {
    throw redirect({ to: '/login' });
  }
  if (!user) throw redirect({ to: '/login' });
  return user;
};

export const requireAdmin = async ({ context }: { context: RouterContext }) => {
  const user = await requireAuth({ context });
  if (!user.is_admin) {
    throw redirect({ to: '/library', search: validateLibrarySearch({}) });
  }
  return user;
};

export const redirectIfAuthenticated = async ({ context }: { context: RouterContext }) => {
  let authenticatedUser = null;
  try {
    authenticatedUser = await context.queryClient.ensureQueryData(currentUserQuery());
  } catch {
    // Guests may access the login route.
  }
  if (authenticatedUser) {
    throw redirect({ to: '/library', search: validateLibrarySearch({}) });
  }
};
