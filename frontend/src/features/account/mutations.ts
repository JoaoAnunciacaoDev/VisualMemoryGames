import api from '@/services/api';

export async function updateAccountProfile({
  username,
  isPublic,
}: {
  username?: string;
  isPublic?: boolean;
}) {
  if (username !== undefined) await api.put('/users/me', { username });
  if (isPublic !== undefined) await api.patch('/users/me/visibility', { is_public: isPublic });
}

export const changeAccountPassword = (input: { currentPassword: string; newPassword: string }) =>
  api.put('/users/me/password', {
    current_password: input.currentPassword,
    new_password: input.newPassword,
  });

export const deactivateAccount = (password: string) =>
  api.post('/users/me/deactivate', { password });
