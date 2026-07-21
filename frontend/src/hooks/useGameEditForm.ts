import { ChangeEvent, useState } from 'react';
import api from '@/services/api';
import { LibraryGame } from '@/types';
import { UpdateLibraryGame } from '@/types/updateGame';
import { resolveImageUrl } from '@/services/media';
import { isValidUrl } from '@/utils/validation';

export type EditGamePayload = Partial<UpdateLibraryGame> & {
  custom_cover_file?: File | null;
};

export function useGameEditForm(game: LibraryGame) {
  const [form, setForm] = useState<UpdateLibraryGame>({
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

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState(game.title);
  const [editReleaseYear, setEditReleaseYear] = useState(game.release_year?.toString() ?? '');
  const [editPlatforms, setEditPlatforms] = useState<string[]>(game.platforms ?? []);
  const [editGenres, setEditGenres] = useState<string[]>(game.genres ?? []);

  const canReview = form.status !== 'Quero Jogar';

  const updateField = <K extends keyof UpdateLibraryGame>(
    field: K,
    value: UpdateLibraryGame[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusChange = (newStatus: string) => {
    setForm((prev) => {
      const isWantToPlay = newStatus === 'Quero Jogar';
      return {
        ...prev,
        status: newStatus,
        rating: isWantToPlay ? null : prev.rating,
        finished_at: isWantToPlay ? '' : prev.finished_at,
        notes: isWantToPlay ? '' : prev.notes,
        platinum_at: isWantToPlay ? '' : prev.platinum_at,
      };
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    // Validação de limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFileError('O arquivo de imagem deve ter no máximo 5MB.');
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    updateField('custom_cover_url', '');
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    updateField('custom_cover_url', e.target.value);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSave = async () => {
    // Validação de Comprimento de Anos nas Datas (evita estouro > 9999 e erros silenciosos)
    const checkDateYear = (dateStr: string | null) => {
      if (!dateStr) return;
      const parts = dateStr.split('-');
      if (parts[0] && parts[0].length > 4) {
        throw new Error('O ano das datas não pode conter mais de 4 dígitos.');
      }
    };
    checkDateYear(form.acquired_at);
    checkDateYear(form.started_at);
    checkDateYear(form.finished_at);
    checkDateYear(form.platinum_at);

    // Validações de Jogo Manual
    if (game.is_manual) {
      if (!editTitle.trim()) {
        throw new Error('O nome do jogo é obrigatório.');
      }
      if (editReleaseYear) {
        const yearVal = Number(editReleaseYear);
        if (isNaN(yearVal) || !Number.isInteger(yearVal) || yearVal < 1 || yearVal > new Date().getFullYear() + 10) {
          throw new Error('Por favor, insira um ano de lançamento válido (maior ou igual a 1).');
        }
      }
    }

    // Validação da URL da Capa Customizada
    if (form.custom_cover_url && !isValidUrl(form.custom_cover_url)) {
      throw new Error('A URL da capa deve ser um link HTTP ou HTTPS válido.');
    }

    // Validação de Horas Jogadas
    if (form.hours_played !== null && (isNaN(form.hours_played) || form.hours_played < 0)) {
      throw new Error('As horas jogadas não podem ser negativas.');
    }

    // Validação de Nota
    if (canReview && form.rating !== null && (isNaN(form.rating) || form.rating < 0 || form.rating > 10)) {
      throw new Error('A nota deve ser entre 0 e 10.');
    }

    if (game.is_manual) {
      const gameFormData = new FormData();
      gameFormData.append('title', editTitle.trim());
      if (editReleaseYear) gameFormData.append('release_year', editReleaseYear);
      gameFormData.append('platforms', JSON.stringify(editPlatforms));
      gameFormData.append('genres', JSON.stringify(editGenres));

      await api.put(`/games/manual/${game.game_id}`, gameFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    let finalCoverUrl = form.custom_cover_url;
    if (coverFile) {
      const coverFormData = new FormData();
      coverFormData.append('cover_file', coverFile);
      const uploadRes = await api.put(`/user-games/${game.id}/cover`, coverFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      finalCoverUrl = uploadRes.data.custom_cover_url;
    }

    const payload: EditGamePayload = {
      status: form.status,
      favorite: form.favorite,
      rating: canReview ? form.rating : null,
      started_at: form.started_at || null,
      finished_at: form.finished_at || null,
      acquired_at: form.acquired_at || null,
      platinum_at: form.platinum_at || null,
      store: form.store || null,
      custom_cover_url: finalCoverUrl || null,
      notes: canReview ? form.notes || null : null,
      hours_played: form.hours_played,
    };

    await api.put(`/user-games/${game.id}`, payload);
    return payload;
  };

  const displayCover =
    coverPreview ||
    (form.custom_cover_url ? resolveImageUrl(form.custom_cover_url) : null) ||
    (game.custom_cover_url ? resolveImageUrl(game.custom_cover_url) : null) ||
    (game.cover_url ? resolveImageUrl(game.cover_url) : null);

  const clearCoverFile = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setFileError(null);
  };

  return {
    form,
    coverFile,
    fileError,
    editTitle,
    setEditTitle,
    editReleaseYear,
    setEditReleaseYear,
    editPlatforms,
    setEditPlatforms,
    editGenres,
    setEditGenres,
    canReview,
    updateField,
    handleStatusChange,
    handleFileChange,
    handleUrlChange,
    clearCoverFile,
    handleSave,
    displayCover,
  };
}