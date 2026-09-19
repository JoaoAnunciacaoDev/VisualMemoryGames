import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addManualGameToLibrary } from '@/features/games/mutations';
import { libraryKeys } from '@/features/library/queries';
import { isValidUrl } from '@/utils/validation';

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const MAX_FUTURE_RELEASE_YEARS = 10;

export function useManualGameForm(onSuccess: () => void, onClose: () => void) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const createMutation = useMutation({
    mutationFn: addManualGameToLibrary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  });

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > MAX_COVER_SIZE) {
      setError('O arquivo de capa deve ter no máximo 5MB.');
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverUrl('');
  };

  const setCoverFromUrl = (value: string) => {
    setCoverUrl(value);
    setCoverFile(null);
    setCoverPreview(value || null);
  };

  const clearCoverFile = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const submit = async () => {
    if (!title.trim()) return setError('O nome do jogo é obrigatório.');
    if (releaseYear) {
      const year = Number(releaseYear);
      if (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear() + MAX_FUTURE_RELEASE_YEARS) {
        return setError('Por favor, insira um ano de lançamento válido (maior ou igual a 1).');
      }
    }
    if (coverUrl && !isValidUrl(coverUrl)) return setError('A URL da capa deve ser um link HTTP ou HTTPS válido.');

    setError('');
    const formData = new FormData();
    formData.append('title', title.trim());
    if (releaseYear) formData.append('release_year', releaseYear);
    formData.append('platforms', JSON.stringify(selectedPlatforms));
    formData.append('genres', JSON.stringify(selectedGenres));
    if (coverFile) formData.append('cover_file', coverFile);
    else if (coverUrl) formData.append('cover_url', coverUrl);

    try {
      await createMutation.mutateAsync(formData);
      onSuccess();
      onClose();
    } catch {
      setError('Erro ao salvar jogo. Tente novamente.');
    }
  };

  return {
    title, setTitle, releaseYear, setReleaseYear,
    selectedPlatforms, setSelectedPlatforms, selectedGenres, setSelectedGenres,
    coverUrl, coverFile, coverPreview, error,
    isSaving: createMutation.isPending,
    handleFileChange, setCoverFromUrl, clearCoverFile, submit,
  };
}
