import { Button, Input, Modal } from '@/components/Shared';
import { STANDARD_GENRES } from '@/utils/genres';
import { STANDARD_PLATFORMS } from '@/utils/platforms';
import ManualGameCoverFields from './ManualGameCoverFields';
import SearchableTagSelector from './SearchableTagSelector';
import { useManualGameForm } from './useManualGameForm';
import styles from './ManualGameModal.module.css';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function ManualGameModal({ onSuccess, onClose }: Props) {
  const form = useManualGameForm(onSuccess, onClose);

  return (
    <Modal open onClose={() => !form.isSaving && onClose()} maxWidth="560px" showCloseButton={!form.isSaving}>
      <div className={styles.header}><h3>Adicionar Jogo Manualmente</h3></div>
      <div className={`${styles.body} scrollbar-visualmemory`}>
        <ManualGameCoverFields
          coverUrl={form.coverUrl}
          coverFile={form.coverFile}
          coverPreview={form.coverPreview}
          disabled={form.isSaving}
          onUrlChange={form.setCoverFromUrl}
          onFileChange={form.handleFileChange}
          onClearFile={form.clearCoverFile}
        />
        <label className={styles.label}>
          Nome *
          <Input type="text" placeholder="Nome do jogo" value={form.title} onChange={(event) => form.setTitle(event.target.value)} disabled={form.isSaving} autoFocus />
        </label>
        <label className={styles.label}>
          Ano de lançamento
          <Input type="number" placeholder="Ex: 2024" value={form.releaseYear} onChange={(event) => form.setReleaseYear(event.target.value)} disabled={form.isSaving} min={1} max={new Date().getFullYear() + 10} />
        </label>
        <SearchableTagSelector
          label="Plataformas"
          singular="plataforma"
          options={STANDARD_PLATFORMS}
          selected={form.selectedPlatforms}
          onChange={form.setSelectedPlatforms}
          disabled={form.isSaving}
        />
        <SearchableTagSelector
          label="Gêneros"
          singular="gênero"
          options={STANDARD_GENRES}
          selected={form.selectedGenres}
          onChange={form.setSelectedGenres}
          disabled={form.isSaving}
        />
        {form.error && <p className={styles.error}>{form.error}</p>}
      </div>
      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose} disabled={form.isSaving}>Cancelar</Button>
        <Button onClick={form.submit} disabled={form.isSaving}>{form.isSaving ? 'Adicionando...' : 'Adicionar à Biblioteca'}</Button>
      </div>
    </Modal>
  );
}
