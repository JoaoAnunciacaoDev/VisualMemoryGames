import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import api from '@/services/api';

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

  it('deve redirecionar para /login ao receber 401 de rota protegida', async () => {
    // @ts-expect-error - handlers is an internal Axios property not typed on interceptors
    const rejectHandler = api.interceptors.response.handlers[0].rejected;

    if (rejectHandler) {
      const mockError = {
        response: { status: 401 },
        config: { url: '/user-games' },
      };

      await expect(rejectHandler(mockError)).rejects.toEqual(mockError);
      expect(window.location.href).toBe('/login');
    } else {
      throw new Error('Interceptor rejected handler not found');
    }
  });

  it('nao deve redirecionar se o 401 for na rota de login ou /users/me', async () => {
    // @ts-expect-error - handlers is an internal Axios property not typed on interceptors
    const rejectHandler = api.interceptors.response.handlers[0].rejected;

    if (rejectHandler) {
      const mockErrorLogin = {
        response: { status: 401 },
        config: { url: '/login' },
      };

      await expect(rejectHandler(mockErrorLogin)).rejects.toEqual(mockErrorLogin);
      expect(window.location.href).not.toBe('/login');

      const mockErrorMe = {
        response: { status: 401 },
        config: { url: '/users/me' },
      };

      await expect(rejectHandler(mockErrorMe)).rejects.toEqual(mockErrorMe);
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
      expect(window.location.href).not.toBe('/login');
    } else {
      throw new Error('Interceptor rejected handler not found');
    }
  });
});
