import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';

describe('cliente HTTP baseado em fetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia cookies e serializa parâmetros de consulta', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await api.get<{ ok: boolean }>('/games/search', {
      params: { q: 'hollow', page: 2 },
    });

    expect(response.data).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/games/search?q=hollow&page=2',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('preserva o formato de erro usado pela interface', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ detail: 'Entrada inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(api.post('/users/', {})).rejects.toMatchObject({
      response: { status: 400, data: { detail: 'Entrada inválida' } },
      config: { url: '/users/' },
    });
  });
});
