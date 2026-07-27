import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/providers/AuthProvider';
import api from '@/services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve redirecionar para /login se a chamada /users/me falhar (usuário não autenticado)', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(result.current.userId).toBe('');
  });

  it('deve carregar o utilizador quando /users/me retorna com sucesso', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'user-123' } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

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

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/logout');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});