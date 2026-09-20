import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TierLists from '@/pages/TierList/TierList';
import api from '@/services/api';
import { TestRouter } from '@/test/TestRouter';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'user-123', loading: false }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockGet = vi.mocked(api.get);

function renderTierLists() {
  mockGet.mockImplementation((url) => {
    if (url === '/tierlists/me') return Promise.resolve({ data: [] });
    if (url === '/user-games/me') return Promise.resolve({ data: [] });
    if (url === '/lists/me') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  return render(
    <TestRouter>
      <TierLists />
    </TestRouter>,
  );
}

async function openCreateModal() {
  fireEvent.click(await screen.findByRole('button', { name: /nova tier list/i }));
  return screen.findByLabelText('Fonte dos jogos');
}

describe('TierLists lazy loading', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega somente as tierlists ao abrir a página e o modal', async () => {
    renderTierLists();
    await screen.findByText('Você ainda não tem tier lists. Crie uma acima!');
    await openCreateModal();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/tierlists/me');
  });

  it.each(['all', 'status'] as const)(
    'carrega a biblioteca somente ao selecionar a fonte %s',
    async (source) => {
      renderTierLists();
      const sourceSelect = await openCreateModal();
      fireEvent.change(sourceSelect, { target: { value: source } });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/user-games/me', {
          params: { offset: 0, limit: 100 },
        });
      });
      expect(mockGet).not.toHaveBeenCalledWith('/lists/me');
    },
  );

  it('carrega somente as listas ao selecionar lista personalizada', async () => {
    renderTierLists();
    const sourceSelect = await openCreateModal();
    fireEvent.change(sourceSelect, { target: { value: 'list' } });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/lists/me'));
    expect(mockGet.mock.calls.some(([url]) => url === '/user-games/me')).toBe(false);
  });
});
