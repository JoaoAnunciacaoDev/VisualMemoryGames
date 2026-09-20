import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomListsTab from '@/components/CustomListTab/CustomListTab';
import { TestQueryProvider } from '@/test/TestRouter';
import api from '@/services/api';

vi.mock('@/services/api');
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

describe('CustomListsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: [] });
  });

  it('renders the empty state', async () => {
    render(<TestQueryProvider><CustomListsTab libraryGames={[]} onLibraryChange={vi.fn()} /></TestQueryProvider>);
    expect(await screen.findByText('Nenhuma lista criada ainda. Crie uma acima!')).toBeInTheDocument();
  });

  it('creates a named list', async () => {
    mockApi.post.mockResolvedValue({});
    render(<TestQueryProvider><CustomListsTab libraryGames={[]} onLibraryChange={vi.fn()} /></TestQueryProvider>);
    fireEvent.change(screen.getByPlaceholderText('Nome da nova lista...'), { target: { value: 'Favoritos locais' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Lista' }));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/lists/', { name: 'Favoritos locais' }));
  });
});
