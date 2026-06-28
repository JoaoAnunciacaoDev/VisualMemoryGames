import { useState } from 'react';
import api from '@/services/api';
import { LibraryGame } from '@/types';
import { UpdateLibraryGame } from '@/types/updateGame';
import { resolveImageUrl } from '@/services/media';

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

  const [editTitle, setEditTitle] = useState(game.title);
  const [editReleaseYear, setEditReleaseYear] = useState(game.release_year?.toString() ?? '');
  const [editPlatforms, setEditPlatforms] = useState(game.platforms?.join(', ') ?? '');
  const [editGenres, setEditGenres] = useState(game.genres?.join(', ') ?? '');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    updateField('custom_cover_url', '');
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateField('custom_cover_url', e.target.value);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSave = async () => {
    if (game.is_manual) {
      const gameFormData = new FormData();
      gameFormData.append('title', editTitle.trim());
      if (editReleaseYear) gameFormData.append('release_year', editReleaseYear);
      gameFormData.append('platforms', JSON.stringify(editPlatforms.split(',').map(p => p.trim()).filter(Boolean)));
      gameFormData.append('genres', JSON.stringify(editGenres.split(',').map(g => g.trim()).filter(Boolean)));

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
    };

  return {
    form,
    coverFile,
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