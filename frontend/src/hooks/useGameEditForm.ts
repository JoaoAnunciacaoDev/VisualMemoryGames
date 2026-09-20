import { ChangeEvent, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LibraryGame } from '@/types';
import { UpdateLibraryGame } from '@/types/updateGame';
import { saveLibraryGameEdits } from '@/features/library/mutations';
import { libraryKeys } from '@/features/library/queries';
import {
  buildGameEditPayload,
  buildManualGameData,
  createGameEditForm,
  getGameEditCover,
  MAX_COVER_FILE_SIZE,
  validateGameEdit,
  type EditGamePayload,
  type ManualGameFields,
} from '@/features/library/gameEdit';

export type { EditGamePayload } from '@/features/library/gameEdit';

export function useGameEditForm(game: LibraryGame) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateLibraryGame>(() => createGameEditForm(game));

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState(game.title);
  const [editReleaseYear, setEditReleaseYear] = useState(game.release_year?.toString() ?? '');
  const [editPlatforms, setEditPlatforms] = useState<string[]>(game.platforms ?? []);
  const [editGenres, setEditGenres] = useState<string[]>(game.genres ?? []);
  const saveMutation = useMutation({
    mutationFn: saveLibraryGameEdits,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.mine() }),
  });

  const canReview = form.status !== 'Quero Jogar' && form.status !== 'Na biblioteca';

  const updateField = useCallback(
    <K extends keyof UpdateLibraryGame>(field: K, value: UpdateLibraryGame[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleStatusChange = (newStatus: string) => {
    setForm((prev) => {
      const isNoReview = newStatus === 'Quero Jogar' || newStatus === 'Na biblioteca';
      return {
        ...prev,
        status: newStatus,
        rating: isNoReview ? null : prev.rating,
        finished_at: isNoReview ? '' : prev.finished_at,
        notes: isNoReview ? '' : prev.notes,
        platinum_at: isNoReview ? '' : prev.platinum_at,
      };
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    if (file.size > MAX_COVER_FILE_SIZE) {
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
    const manual: ManualGameFields = {
      title: editTitle,
      releaseYear: editReleaseYear,
      platforms: editPlatforms,
      genres: editGenres,
    };
    validateGameEdit(game, form, manual, canReview);
    const manualGameData = buildManualGameData(game, manual);
    const payload: EditGamePayload = buildGameEditPayload(form, canReview);

    return saveMutation.mutateAsync({
      userGameId: game.id,
      manualGameId: game.is_manual ? game.game_id : undefined,
      manualGameData,
      coverFile,
      data: payload,
    }) as Promise<EditGamePayload>;
  };

  const displayCover = getGameEditCover(game, form.custom_cover_url, coverPreview);

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
