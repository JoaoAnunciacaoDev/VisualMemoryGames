import { queryOptions } from '@tanstack/react-query';
import api from '@/services/api';

export interface SocialGame {
  id: string;
  external_id: number;
  title: string;
  cover_url: string;
  release_year: number;
  platforms: string[];
  genres: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean | null;
}

export interface Activity {
  id: number;
  user_id: string;
  username: string;
  game: SocialGame | null;
  action_type: string;
  context: string | null;
  created_at: string;
  target_user?: UserProfile | null;
  tierlist_id?: string | null;
  tierlist_title?: string | null;
  commentary?: string | null;
}

export interface RawgRelease {
  title: string;
  cover_url: string | null;
  release_date: string | null;
  genres: string[];
}

export interface PaginatedActivities {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FeedData {
  activities: PaginatedActivities;
  rawg_releases: RawgRelease[];
}

export const socialKeys = {
  all: ['social'] as const,
  feed: (month: number, year: number, page: number) => [...socialKeys.all, 'feed', month, year, page] as const,
  weeklyReleases: () => [...socialKeys.all, 'weekly-releases'] as const,
  mine: (month: number, year: number, page: number) => [...socialKeys.all, 'mine', month, year, page] as const,
  search: (query: string) => [...socialKeys.all, 'search', query] as const,
};

export const socialFeedQuery = (month: number, year: number, page: number) => queryOptions({
  queryKey: socialKeys.feed(month, year, page),
  queryFn: async () => (
    await api.get<FeedData>('/social/feed', {
      params: { month, year, page, include_releases: false },
    })
  ).data,
});

export const weeklyReleasesQuery = () => queryOptions({
  queryKey: socialKeys.weeklyReleases(),
  queryFn: async () => (await api.get<RawgRelease[]>('/social/releases/weekly')).data,
  staleTime: 6 * 60 * 60 * 1000,
  gcTime: 6 * 60 * 60 * 1000,
});

export const myActivitiesQuery = (month: number, year: number, page: number) => queryOptions({
  queryKey: socialKeys.mine(month, year, page),
  queryFn: async () => (await api.get<PaginatedActivities>('/social/activities/me', { params: { month, year, page } })).data,
});

export const userSearchQuery = (query: string) => queryOptions({
  queryKey: socialKeys.search(query),
  queryFn: async () => (await api.get<UserProfile[]>(`/social/users/search?q=${encodeURIComponent(query)}`)).data,
  enabled: query.length > 0,
});

export const setFollowing = async ({ userId, following }: { userId: string; following: boolean }) => {
  const url = `/social/users/${userId}/follow`;
  if (following) await api.delete(url);
  else await api.post(url);
};
