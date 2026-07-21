import { ChangeEvent, useState } from 'react';
import api from '@/services/api';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import { isValidUrl } from '@/utils/validation';
import { STANDARD_GENRES } from '@/utils/genres';
import { STANDARD_PLATFORMS } from '@/utils/platforms';
import styles from '@/components/ManualGameModal/ManualGameModal.module.css';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function ManualGameModal({ onSuccess, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    
    // Limite de tamanho de arquivo de 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo de capa deve ter no máximo 5MB.');
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverUrl('');
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCoverUrl(e.target.value);
    setCoverFile(null);
    setCoverPreview(e.target.value || null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('O nome do jogo é obrigatório.');
      return;
    }

    // Validação do Ano de Lançamento
    if (releaseYear) {
      const yearVal = Number(releaseYear);
      if (isNaN(yearVal) || !Number.isInteger(yearVal) || yearVal < 1 || yearVal > new Date().getFullYear() + 10) {
        setError('Por favor, insira um ano de lançamento válido (maior ou igual a 1).');
        return;
      }
    }

    // Validação da URL da Capa
    if (coverUrl && !isValidUrl(coverUrl)) {
      setError('A URL da capa deve ser um link HTTP ou HTTPS válido.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (releaseYear) formData.append('release_year', releaseYear);
      formData.append('platforms', JSON.stringify(selectedPlatforms));
      formData.append('genres', JSON.stringify(selectedGenres));
      if (coverFile) {
        formData.append('cover_file', coverFile);
      } else if (coverUrl) {
        formData.append('cover_url', coverUrl);
      }

      const gameResponse = await api.post('/games/manual', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await api.post('/user-games/', { game_id: gameResponse.data.id });

      onSuccess();
      onClose();
    } catch {
      setError('Erro ao salvar jogo. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const [genreSearch, setGenreSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredGenres = STANDARD_GENRES.filter((genre) => {
    const matchesSearch = genre.label.toLowerCase().includes(genreSearch.toLowerCase()) || 
                          genre.id.toLowerCase().includes(genreSearch.toLowerCase());
    const notSelected = !selectedGenres.includes(genre.id);
    return matchesSearch && notSelected;
  });

  const showCustomOption = 
    genreSearch.trim() !== '' &&
    !selectedGenres.some(g => g.toLowerCase() === genreSearch.trim().toLowerCase()) &&
    !STANDARD_GENRES.some(g => g.label.toLowerCase() === genreSearch.trim().toLowerCase() || g.id.toLowerCase() === genreSearch.trim().toLowerCase());

  const [platformSearch, setPlatformSearch] = useState('');
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);

  const filteredPlatforms = STANDARD_PLATFORMS.filter((platform) => {
    const matchesSearch = platform.label.toLowerCase().includes(platformSearch.toLowerCase()) || 
                          platform.id.toLowerCase().includes(platformSearch.toLowerCase());
    const notSelected = !selectedPlatforms.includes(platform.id);
    return matchesSearch && notSelected;
  });

  const showCustomPlatformOption = 
    platformSearch.trim() !== '' &&
    !selectedPlatforms.some(p => p.toLowerCase() === platformSearch.trim().toLowerCase()) &&
    !STANDARD_PLATFORMS.some(p => p.label.toLowerCase() === platformSearch.trim().toLowerCase() || p.id.toLowerCase() === platformSearch.trim().toLowerCase());

  return (
    <Modal open onClose={() => !isSaving && onClose()} maxWidth="560px" showCloseButton={!isSaving}>
      <div className={styles.header}>
        <h3>Adicionar Jogo Manualmente</h3>
      </div>

      <div className={`${styles.body} scrollbar-visualmemory`}>
        <div className={styles.coverSection}>
          <div className={styles.coverPreview}>
            {coverPreview ? (
              <img src={coverPreview} alt="Preview da capa" className={styles.previewImg} />
            ) : (
              <div className={styles.coverPlaceholder}>
                <span>Sem capa</span>
              </div>
            )}
          </div>

          <div className={styles.coverInputs}>
            <label className={styles.label}>
              URL da capa
              <Input
                type="url"
                placeholder="https://..."
                value={coverUrl}
                onChange={handleUrlChange}
                disabled={!!coverFile || isSaving}
              />
            </label>
            <span className={styles.orDivider}>ou</span>
            <label className={`${styles.fileLabel} ${isSaving ? styles.disabledLabel : ''}`}>
              {coverFile ? coverFile.name : 'Escolher arquivo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
                disabled={isSaving}
              />
            </label>
            {coverFile && (
              <button
                type="button"
                className={styles.clearFile}
                onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                disabled={isSaving}
              >
                Remover arquivo
              </button>
            )}
          </div>
        </div>

        <label className={styles.label}>
          Nome *
          <Input
            type="text"
            placeholder="Nome do jogo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
            autoFocus
          />
        </label>

        <label className={styles.label}>
          Ano de lançamento
          <Input
            type="number"
            placeholder="Ex: 2024"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
            disabled={isSaving}
            min={1}
            max={new Date().getFullYear() + 10}
          />
        </label>

        <div className={styles.genresSection}>
          <span className={styles.genresLabel}>Plataformas</span>
          
          {selectedPlatforms.length > 0 && (
            <div className={styles.genreTagsContainer}>
              {selectedPlatforms.map((platformId) => {
                const platformLabel = STANDARD_PLATFORMS.find((p) => p.id === platformId)?.label ?? platformId;
                return (
                  <span key={platformId} className={styles.selectedGenreTag}>
                    {platformLabel}
                    <button
                      type="button"
                      className={styles.removeTagBtn}
                      onClick={() => setSelectedPlatforms(selectedPlatforms.filter((id) => id !== platformId))}
                      disabled={isSaving}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Pesquisar ou adicionar plataforma..."
              className={styles.genreSearchInput}
              value={platformSearch}
              onChange={(e) => setPlatformSearch(e.target.value)}
              onFocus={() => setIsPlatformDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsPlatformDropdownOpen(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmed = platformSearch.trim();
                  if (trimmed) {
                    const matchedStandard = STANDARD_PLATFORMS.find(
                      (p) => p.label.toLowerCase() === trimmed.toLowerCase() || p.id.toLowerCase() === trimmed.toLowerCase()
                    );
                    const platformToAdd = matchedStandard ? matchedStandard.id : trimmed;
                    if (!selectedPlatforms.includes(platformToAdd)) {
                      setSelectedPlatforms([...selectedPlatforms, platformToAdd]);
                    }
                    setPlatformSearch('');
                  }
                }
              }}
              disabled={isSaving}
            />

            {isPlatformDropdownOpen && (filteredPlatforms.length > 0 || showCustomPlatformOption) && (
              <div className={`${styles.dropdownList} scrollbar-visualmemory`}>
                {filteredPlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    className={styles.dropdownItem}
                    onMouseDown={() => {
                      setSelectedPlatforms([...selectedPlatforms, platform.id]);
                      setPlatformSearch('');
                    }}
                  >
                    {platform.label}
                  </button>
                ))}
                {showCustomPlatformOption && (
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.customItem}`}
                    onMouseDown={() => {
                      setSelectedPlatforms([...selectedPlatforms, platformSearch.trim()]);
                      setPlatformSearch('');
                    }}
                  >
                    + Adicionar "{platformSearch.trim()}" como plataforma personalizada
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.genresSection}>
          <span className={styles.genresLabel}>Gêneros</span>
          
          {selectedGenres.length > 0 && (
            <div className={styles.genreTagsContainer}>
              {selectedGenres.map((genreId) => {
                const genreLabel = STANDARD_GENRES.find((g) => g.id === genreId)?.label ?? genreId;
                return (
                  <span key={genreId} className={styles.selectedGenreTag}>
                    {genreLabel}
                    <button
                      type="button"
                      className={styles.removeTagBtn}
                      onClick={() => setSelectedGenres(selectedGenres.filter((id) => id !== genreId))}
                      disabled={isSaving}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Pesquisar ou adicionar gênero..."
              className={styles.genreSearchInput}
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsDropdownOpen(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmed = genreSearch.trim();
                  if (trimmed) {
                    const matchedStandard = STANDARD_GENRES.find(
                      (g) => g.label.toLowerCase() === trimmed.toLowerCase() || g.id.toLowerCase() === trimmed.toLowerCase()
                    );
                    const genreToAdd = matchedStandard ? matchedStandard.id : trimmed;
                    if (!selectedGenres.includes(genreToAdd)) {
                      setSelectedGenres([...selectedGenres, genreToAdd]);
                    }
                    setGenreSearch('');
                  }
                }
              }}
              disabled={isSaving}
            />

            {isDropdownOpen && (filteredGenres.length > 0 || showCustomOption) && (
              <div className={`${styles.dropdownList} scrollbar-visualmemory`}>
                {filteredGenres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    className={styles.dropdownItem}
                    onMouseDown={() => {
                      setSelectedGenres([...selectedGenres, genre.id]);
                      setGenreSearch('');
                    }}
                  >
                    {genre.label}
                  </button>
                ))}
                {showCustomOption && (
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.customItem}`}
                    onMouseDown={() => {
                      setSelectedGenres([...selectedGenres, genreSearch.trim()]);
                      setGenreSearch('');
                    }}
                  >
                    + Adicionar "{genreSearch.trim()}" como gênero personalizado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Adicionando...' : 'Adicionar à Biblioteca'}
        </Button>
      </div>
    </Modal>
  );
}