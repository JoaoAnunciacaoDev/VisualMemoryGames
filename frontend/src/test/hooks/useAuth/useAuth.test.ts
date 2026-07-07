import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/providers/AuthProvider';
import * as authService from '@/services/auth';
import api from '@/services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/services/auth', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve redirecionar para /login se não houver token', async () => {
    vi.mocked(authService.getToken).mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(result.current.userId).toBe('');
  });

  it('deve carregar o utilizador quando há um token válido', async () => {
    vi.mocked(authService.getToken).mockReturnValue('fake-token');
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

  it('deve redirecionar para /login se a API falhar', async () => {
    vi.mocked(authService.getToken).mockReturnValue('fake-token');
    vi.mocked(api.get).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.userId).toBe('');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('logout deve limpar o token e navegar para /login', () => {
    vi.mocked(authService.getToken).mockReturnValue('fake-token');
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'user-123' } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.logout();
    });

    expect(authService.clearToken).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});