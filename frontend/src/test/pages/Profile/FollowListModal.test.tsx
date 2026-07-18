import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FollowListModal from '@/pages/Profile/FollowListModal';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/services/api');
vi.mock('@/hooks/useAuth');

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>, post: ReturnType<typeof vi.fn>, delete: ReturnType<typeof vi.fn> };

const mockUsers = [
  {
    id: 'user1',
    username: 'testuser1',
    is_public: true,
    followers_count: 5,
    following_count: 2,
    is_following: false,
  },
  {
    id: 'user2',
    username: 'testuser2',
    is_public: true,
    followers_count: 10,
    following_count: 15,
    is_following: true,
  },
];

describe('FollowListModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: 'me-id' });
  });

  it('renders loading state initially', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <FollowListModal userId="me-id" type="followers" onClose={mockOnClose} />
      </MemoryRouter>
    );
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders list of followers after fetch', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockUsers });

    render(
      <MemoryRouter>
        <FollowListModal userId="me-id" type="followers" onClose={mockOnClose} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
    });

    expect(mockApi.get).toHaveBeenCalledWith('/social/users/me-id/followers');
  });

  it('displays empty state when no users found', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <FollowListModal userId="me-id" type="following" onClose={mockOnClose} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument();
    });
  });

  it('allows following/unfollowing users', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockUsers });
    mockApi.post.mockResolvedValueOnce({});
    mockApi.delete.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <FollowListModal userId="me-id" type="followers" onClose={mockOnClose} />
      </MemoryRouter>
    );

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
    });

    // testuser1 is NOT following, so button says "Seguir"
    const followButtons = screen.getAllByRole('button', { name: /seguir|seguindo/i });
    expect(followButtons[0]).toHaveTextContent('Seguir');

    // Click to follow testuser1
    fireEvent.click(followButtons[0]);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/social/users/user1/follow');
    });

    // testuser2 IS following, so button says "Seguindo"
    expect(followButtons[1]).toHaveTextContent('Seguindo');

    // Click to unfollow testuser2
    fireEvent.click(followButtons[1]);

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith('/social/users/user2/follow');
    });
  });

  it('closes modal when close button is clicked', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <FollowListModal userId="me-id" type="followers" onClose={mockOnClose} />
      </MemoryRouter>
    );

    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
