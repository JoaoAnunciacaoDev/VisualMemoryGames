import type { ChangeEvent } from 'react';
import { Input } from '@/components/Shared';
import styles from './ManualGameModal.module.css';

export default function ManualGameCoverFields({
  coverUrl,
  coverFile,
  coverPreview,
  disabled,
  onUrlChange,
  onFileChange,
  onClearFile,
}: {
  coverUrl: string;
  coverFile: File | null;
  coverPreview: string | null;
  disabled: boolean;
  onUrlChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}) {
  return (
    <div className={styles.coverSection}>
      <div className={styles.coverPreview}>
        {coverPreview
          ? <img src={coverPreview} alt="Preview da capa" className={styles.previewImg} />
          : <div className={styles.coverPlaceholder}><span>Sem capa</span></div>}
      </div>
      <div className={styles.coverInputs}>
        <label className={styles.label}>
          URL da capa
          <Input type="url" placeholder="https://..." value={coverUrl} onChange={(event) => onUrlChange(event.target.value)} disabled={!!coverFile || disabled} />
        </label>
        <span className={styles.orDivider}>ou</span>
        <label className={`${styles.fileLabel} ${disabled ? styles.disabledLabel : ''}`}>
          {coverFile ? coverFile.name : 'Escolher arquivo'}
          <input type="file" accept="image/*" onChange={onFileChange} className={styles.fileInput} disabled={disabled} />
        </label>
        {coverFile && <button type="button" className={styles.clearFile} onClick={onClearFile} disabled={disabled}>Remover arquivo</button>}
      </div>
    </div>
  );
}
