export interface GameResult {
  external_id: number;
  title: string;
  cover_url: string;
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
}