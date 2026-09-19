import api from '@/services/api';

export async function loginUser({
  username,
  password,
  rememberMe,
}: {
  username: string;
  password: string;
  rememberMe: boolean;
}) {
  const params = new URLSearchParams({
    username,
    password,
    remember_me: String(rememberMe),
  });
  await api.post('/login', params);
}

export const initiateRegistration = (input: { username: string; email: string; password: string }) =>
  api.post('/users/register/initiate', input);

export const confirmRegistration = (input: {
  username: string;
  email: string;
  password: string;
  code: string;
}) => api.post('/users/', input);

export const initiatePasswordReset = (email: string) =>
  api.post('/password-reset/initiate', { email });

export const confirmPasswordReset = (input: { email: string; code: string; newPassword: string }) =>
  api.post('/password-reset/confirm', {
    email: input.email,
    code: input.code,
    new_password: input.newPassword,
  });

export const logoutUser = () => api.post('/logout');
