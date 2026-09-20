import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { fetchAllPages } from '@/services/pagination';

describe('fetchAllPages', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mantém a primeira chamada compatível e busca páginas adicionais', async () => {
    const firstPage = Array.from({ length: 50 }, (_, id) => ({ id }));
    const secondPage = [{ id: 50 }, { id: 51 }];
    const get = vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({ data: secondPage });

    const result = await fetchAllPages<{ id: number }>('/items');

    expect(result).toHaveLength(52);
    expect(get).toHaveBeenNthCalledWith(1, '/items');
    expect(get).toHaveBeenNthCalledWith(2, '/items', {
      params: { offset: 50, limit: 50 },
    });
  });
});
