import { Store } from '@/types/enums';

export interface UpdateLibraryGame {
  status?: string;
  rating?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  acquired_at?: string | null;
  platinum_at?: string | null;
  hours_played?: number | null;
  store?: Store | null;
  favorite?: boolean;
  custom_cover_url?: string | null;
  notes?: string | null;
}