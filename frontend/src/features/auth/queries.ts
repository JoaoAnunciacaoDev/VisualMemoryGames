import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { User } from '@/types';

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'me'] as const,
};

export const currentUserQuery = () => queryOptions({
  queryKey: authKeys.currentUser(),
  queryFn: async () => (await api.get<User>('/users/me')).data,
  retry: false,
});
