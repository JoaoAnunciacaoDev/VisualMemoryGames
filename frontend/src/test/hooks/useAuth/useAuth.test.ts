import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/providers/AuthProvider';
import api from '@/services/api';
import { TestQueryProvider } from '@/test/TestRouter';
import { createElement, type ReactNode } from 'react';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useAuth', () => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(TestQueryProvider, null, createElement(AuthProvider, null, children));
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve expor usuário vazio se a chamada /users/me falhar', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.userId).toBe('');
  });

  it('deve carregar o utilizador quando /users/me retorna com sucesso', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'user-123' } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/me');
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.userId).toBe('user-123');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logout deve chamar /logout na API e navegar para /login', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'user-123' } });
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'Desconectado com sucesso' } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/logout');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
  });
});
