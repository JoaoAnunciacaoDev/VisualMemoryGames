import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Social from '@/pages/Social/Social';
import api from '@/services/api';

vi.mock('@/services/api');

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>, post: ReturnType<typeof vi.fn>, delete: ReturnType<typeof vi.fn> };

const mockFeed = {
  activities: {
    items: [
      {
        id: 'act1',
        user_id: 'user1',
        username: 'testuser',
        action_type: 'ADDED',
        game: {
          id: 'game1',
          title: 'Cyberpunk 2077',
          cover_url: 'https://example.com/cyberpunk.jpg'
        },
        created_at: '2023-10-27T10:00:00Z'
      }
    ],
    total: 1,
    page: 1,
    page_size: 10,
    total_pages: 1,
  },
  rawg_releases: [
    {
      id: 'rawg1',
      title: 'New Released Game',
      cover_url: 'https://example.com/newgame.jpg',
      release_date: '2023-10-26',
      genres: []
    }
  ]
};

describe('Social Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state for feed', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <Social />
      </MemoryRouter>
    );
    expect(screen.getByText('Carregando feed...')).toBeInTheDocument();
  });

  it('renders feed activities and rawg releases', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockFeed });

    render(
      <MemoryRouter>
        <Social />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Activity
      expect(screen.getByText(/adicionou/i)).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Cyberpunk 2077')).toBeInTheDocument();
      
      // RAWG release
      expect(screen.getByText('Lançamentos da Semana')).toBeInTheDocument();
      expect(screen.getByText('New Released Game')).toBeInTheDocument();
    });

    expect(mockApi.get).toHaveBeenCalledWith('/social/feed', expect.any(Object));
  });

  it('renders pagination controls when total_pages > 1 and navigates', async () => {
    const paginatedMockFeed = {
      activities: {
        items: [
          {
            id: 'act1',
            user_id: 'user1',
            username: 'testuser',
            action_type: 'ADDED',
            game: {
              id: 'game1',
              title: 'Cyberpunk 2077',
              cover_url: 'https://example.com/cyberpunk.jpg'
            },
            created_at: '2023-10-27T10:00:00Z'
          }
        ],
        total: 25,
        page: 1,
        page_size: 10,
        total_pages: 3,
      },
      rawg_releases: []
    };

    mockApi.get.mockResolvedValueOnce({ data: paginatedMockFeed });

    render(
      <MemoryRouter>
        <Social />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('‹ Anterior')).toBeInTheDocument();
      expect(screen.getByText('Próximo ›')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Click next page
    mockApi.get.mockResolvedValueOnce({
      data: {
        ...paginatedMockFeed,
        activities: { ...paginatedMockFeed.activities, page: 2 }
      }
    });

    fireEvent.click(screen.getByText('2'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenLastCalledWith(
        '/social/feed',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      );
    });
  });

  it('searches for users correctly', async () => {
    // Mock router
    mockApi.get.mockImplementation((url) => {
      if (url === '/social/feed') {
        return Promise.resolve({
          data: {
            activities: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
            rawg_releases: []
          }
        });
      }
      if (url.startsWith('/social/users/search')) {
        return Promise.resolve({
          data: [
            {
              id: 'user2',
              username: 'searcheduser',
              is_public: true,
              followers_count: 5,
              following_count: 2,
              is_following: false,
            }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <Social />
      </MemoryRouter>
    );

    // Switch to search tab
    const searchTab = screen.getByText('Encontrar Pessoas');
    fireEvent.click(searchTab);

    // Enter query and submit
    const searchInput = screen.getByPlaceholderText('Pesquisar por nome de usuário...');
    fireEvent.change(searchInput, { target: { value: 'searcheduser' } });

    // Submit the form directly instead of clicking the button to bypass JSDOM submit issues
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/social/users/search?q=searcheduser');
      expect(screen.getByText('searcheduser')).toBeInTheDocument();
      expect(screen.getByText(/5\s+seguidores/i)).toBeInTheDocument();
    });
  });
});

