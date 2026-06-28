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
  release_year: number | null;
  rating: number | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  acquired_at: string | null;
  platinum_at: string |null;
  hours_played: number | null;
  store: string | null;
  custom_cover_url: string | null;
  favorite: boolean;
  notes: string | null;
  is_manual: boolean;
  platforms: string[];
  genres: string[];
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

export interface TierItem {
  id: string;
  game_id: string;
  order_index: number;
  game?: {
    id: string;
    title: string;
    cover_url: string | null;
    custom_cover_url?: string | null;
  };
}

export interface TierCategory {
  id: string;
  name: string;
  color: string;
  items: TierItem[];
}

export interface TierListSummary {
  id: string;
  title: string;
  categories: TierCategory[];
}

export interface GameInList {
  id: string;
  title: string;
  cover_url: string | null;
  external_id: number;
}

export interface GameDisplay {
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
  platforms: string[];
  genres: string[];
}
