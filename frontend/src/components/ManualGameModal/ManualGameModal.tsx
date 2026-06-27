import { useState } from 'react';
import api from '@/services/api';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import styles from '@/components/ManualGameModal/ManualGameModal.module.css';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function ManualGameModal({ onSuccess, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [platforms, setPlatforms] = useState('');
  const [genres, setGenres] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverUrl('');
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverUrl(e.target.value);
    setCoverFile(null);
    setCoverPreview(e.target.value || null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('O nome do jogo é obrigatório.');
      return;
    }
    setIsSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (releaseYear) formData.append('release_year', releaseYear);
      formData.append('platforms', JSON.stringify(
        platforms.split(',').map((p) => p.trim()).filter(Boolean)
      ));
      formData.append('genres', JSON.stringify(
        genres.split(',').map((g) => g.trim()).filter(Boolean)
      ));
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

  return (
    <Modal open onClose={onClose} maxWidth="560px" showCloseButton>
      <div className={styles.header}>
        <h3>Adicionar Jogo Manualmente</h3>
      </div>

      <div className={styles.body}>
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
                disabled={!!coverFile}
              />
            </label>
            <span className={styles.orDivider}>ou</span>
            <label className={styles.fileLabel}>
              {coverFile ? coverFile.name : 'Escolher arquivo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
            </label>
            {coverFile && (
              <button
                className={styles.clearFile}
                onClick={() => { setCoverFile(null); setCoverPreview(null); }}
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
            min={1970}
            max={new Date().getFullYear() + 2}
          />
        </label>

        <label className={styles.label}>
          Plataformas
          <Input
            type="text"
            placeholder="Ex: PC, PlayStation 5, Xbox (separados por vírgula)"
            value={platforms}
            onChange={(e) => setPlatforms(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          Gêneros
          <Input
            type="text"
            placeholder="Ex: RPG, Action, Indie (separados por vírgula)"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSaving || !title.trim()}
        >
          {isSaving ? 'Salvando...' : 'Adicionar à Biblioteca'}
        </Button>
      </div>
    </Modal>
  );
}