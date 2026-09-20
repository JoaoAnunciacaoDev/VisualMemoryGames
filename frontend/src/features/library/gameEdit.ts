import { resolveImageUrl } from '@/services/media';
import type { LibraryGame } from '@/types';
import type { UpdateLibraryGame } from '@/types/updateGame';
import { isValidUrl } from '@/utils/validation';

export const MAX_COVER_FILE_SIZE = 5 * 1024 * 1024;

export type EditGamePayload = Partial<UpdateLibraryGame> & {
  custom_cover_file?: File | null;
};

export interface ManualGameFields {
  title: string;
  releaseYear: string;
  platforms: string[];
  genres: string[];
}

export const createGameEditForm = (game: LibraryGame): UpdateLibraryGame => ({
  status: game.status,
  rating: game.rating,
  favorite: game.favorite,
  hours_played: game.hours_played,
  store: game.store ?? '',
  acquired_at: game.acquired_at ?? '',
  started_at: game.started_at ?? '',
  finished_at: game.finished_at ?? '',
  platinum_at: game.platinum_at ?? '',
  custom_cover_url: game.custom_cover_url ?? '',
  notes: game.notes ?? '',
});

const validateDateYear = (date: string | null | undefined) => {
  if (date?.split('-')[0]?.length && date.split('-')[0].length > 4) {
    throw new Error('O ano das datas não pode conter mais de 4 dígitos.');
  }
};

export function validateGameEdit(
  game: LibraryGame,
  form: UpdateLibraryGame,
  manual: ManualGameFields,
  canReview: boolean,
) {
  [form.acquired_at, form.started_at, form.finished_at, form.platinum_at].forEach(
    validateDateYear,
  );

  if (game.is_manual) {
    if (!manual.title.trim()) throw new Error('O nome do jogo é obrigatório.');
    if (manual.releaseYear) {
      const year = Number(manual.releaseYear);
      const maximumYear = new Date().getFullYear() + 10;
      if (!Number.isInteger(year) || year < 1 || year > maximumYear) {
        throw new Error(
          'Por favor, insira um ano de lançamento válido (maior ou igual a 1).',
        );
      }
    }
  }

  if (form.custom_cover_url && !isValidUrl(form.custom_cover_url)) {
    throw new Error('A URL da capa deve ser um link HTTP ou HTTPS válido.');
  }
  if (form.hours_played != null && (!Number.isFinite(form.hours_played) || form.hours_played < 0)) {
    throw new Error('As horas jogadas não podem ser negativas.');
  }
  if (
    canReview &&
    form.rating != null &&
    (!Number.isFinite(form.rating) || form.rating < 0 || form.rating > 10)
  ) {
    throw new Error('A nota deve ser entre 0 e 10.');
  }
}

export function buildManualGameData(game: LibraryGame, manual: ManualGameFields) {
  if (!game.is_manual) return undefined;
  const data = new FormData();
  data.append('title', manual.title.trim());
  if (manual.releaseYear) data.append('release_year', manual.releaseYear);
  data.append('platforms', JSON.stringify(manual.platforms));
  data.append('genres', JSON.stringify(manual.genres));
  return data;
}

export const buildGameEditPayload = (
  form: UpdateLibraryGame,
  canReview: boolean,
): EditGamePayload => ({
  status: form.status,
  favorite: form.favorite,
  rating: canReview ? form.rating : null,
  started_at: form.started_at || null,
  finished_at: form.finished_at || null,
  acquired_at: form.acquired_at || null,
  platinum_at: form.platinum_at || null,
  store: form.store || null,
  custom_cover_url: form.custom_cover_url || null,
  notes: canReview ? form.notes || null : null,
  hours_played: form.hours_played,
});

export function getGameEditCover(
  game: LibraryGame,
  customCoverUrl: string | null | undefined,
  coverPreview: string | null,
) {
  return (
    coverPreview ||
    (customCoverUrl ? resolveImageUrl(customCoverUrl) : null) ||
    (game.custom_cover_url ? resolveImageUrl(game.custom_cover_url) : null) ||
    (game.cover_url ? resolveImageUrl(game.cover_url) : null)
  );
}
