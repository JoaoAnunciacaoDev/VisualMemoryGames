import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import api from '@/services/api';
import * as authService from '@/services/auth';

// Mock do auth service
vi.mock('@/services/auth', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe('api response interceptor (401)', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    // @ts-expect-error - delete window.location is not allowed by TypeScript on Location type
    delete window.location;
    (window as unknown as Record<string, unknown>).location = { ...originalLocation, href: '' };
  });

  afterAll(() => {
    (window as unknown as Record<string, unknown>).location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  it('deve limpar o token e redirecionar para /login ao receber 401 de rota protegida', async () => {
    // Obter a função de rejeição diretamente do interceptor registrado no Axios
    // @ts-expect-error - handlers is an internal Axios property not typed on interceptors
    const rejectHandler = api.interceptors.response.handlers[0].rejected;

    if (rejectHandler) {
      const mockError = {
        response: { status: 401 },
        config: { url: '/user-games' },
      };

      await expect(rejectHandler(mockError)).rejects.toEqual(mockError);
      expect(authService.clearToken).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    } else {
      throw new Error('Interceptor rejected handler not found');
    }
  });

  it('nao deve redirecionar nem limpar token se o 401 for na rota de login', async () => {
    // @ts-expect-error - handlers is an internal Axios property not typed on interceptors
    const rejectHandler = api.interceptors.response.handlers[0].rejected;

    if (rejectHandler) {
      const mockError = {
        response: { status: 401 },
        config: { url: '/login' },
      };

      await expect(rejectHandler(mockError)).rejects.toEqual(mockError);
      expect(authService.clearToken).not.toHaveBeenCalled();
      expect(window.location.href).not.toBe('/login');
    } else {
      throw new Error('Interceptor rejected handler not found');
    }
  });

  it('nao deve redirecionar se o erro nao for 401', async () => {
    // @ts-expect-error - handlers is an internal Axios property not typed on interceptors
    const rejectHandler = api.interceptors.response.handlers[0].rejected;

    if (rejectHandler) {
      const mockError = {
        response: { status: 400 },
        config: { url: '/user-games' },
      };

      await expect(rejectHandler(mockError)).rejects.toEqual(mockError);
      expect(authService.clearToken).not.toHaveBeenCalled();
      expect(window.location.href).not.toBe('/login');
    } else {
      throw new Error('Interceptor rejected handler not found');
    }
  });
});
