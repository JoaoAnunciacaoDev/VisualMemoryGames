export interface GameResult {
  external_id: number;
  title: string;
  cover_url: string | null;
  release_year: number | null;
  platforms: string[];
  genres: string[];
}

export interface LibraryGame {
  id: string;
  game_id: string;
  external_id: number | null;
  title: string;
  cover_url: string | null;
  custom_cover_url: string | null;
  status: string;
  rating: number | null;
  favorite: boolean;
  hours_played: number | null;
  store: string | null;
  acquired_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  platinum_at: string | null;
  notes: string | null;
}

export interface GameItem {
  id: string;
  title: string;
  coverUrl: string | undefined;
  itemId?: string;
}

export interface Tier {
  id: string;
  label: string;
  color: string;
}

export interface CustomList {
  id: string;
  name: string;
  games: { id: string; title: string; cover_url: string | null }[];
}

export interface TierListSummary {
  id: string;
  title: string;
  categories: { id: string; name: string; color: string; items: any[] }[];
}