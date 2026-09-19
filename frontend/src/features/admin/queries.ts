import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';
import type { User } from '@/types';

export interface SystemStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
}

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: (search: string) => [...adminKeys.all, 'dashboard', search] as const,
};

export const adminDashboardQuery = (search: string) => queryOptions({
  queryKey: adminKeys.dashboard(search),
  queryFn: async () => {
    const [users, stats] = await Promise.all([
      api.get<User[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
      api.get<SystemStats>('/admin/stats'),
    ]);
    return { users: users.data, stats: stats.data };
  },
});

export const toggleUserActive = async (userId: string) =>
  (await api.post<{ is_deleted: boolean }>(`/admin/users/${userId}/toggle-active`)).data;

export const toggleUserAdmin = async (userId: string) =>
  (await api.post<{ is_admin: boolean }>(`/admin/users/${userId}/toggle-admin`)).data;

export const deleteUser = async (userId: string) => {
  await api.delete(`/admin/users/${userId}`);
};
