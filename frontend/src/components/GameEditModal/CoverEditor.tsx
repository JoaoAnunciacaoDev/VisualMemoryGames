import type { ChangeEvent } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import styles from './GameEditModal.module.css';

interface Props {
  coverUrl: string;
  coverFile: File | null;
  fileError: string | null;
  disabled: boolean;
  onUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onClose: () => void;
}

export default function CoverEditor({ coverUrl, coverFile, fileError, disabled, onUrlChange, onFileChange, onClearFile, onClose }: Props) {
  return (
    <div className={styles.coverEditBox}>
      <label className={styles.coverInputRow}>
        <span className={styles.coverInputLabel}><LinkIcon aria-hidden="true" size={15} /> CAPA POR URL</span>
        <input
          type="url"
          className={styles.coverUrlInput}
          value={coverUrl}
          onChange={onUrlChange}
          placeholder="https://exemplo.com/capa.jpg"
          disabled={Boolean(coverFile) || disabled}
        />
      </label>
      <div className={styles.coverOrDivider}><span>ou</span></div>
      <label className={`${styles.coverUploadZone} ${disabled ? styles.disabledUpload : ''}`}>
        <span className={styles.uploadText}>{coverFile ? coverFile.name : 'Escolher arquivo do PC'}</span>
        <input type="file" accept="image/*" onChange={onFileChange} className={styles.fileInputHidden} disabled={disabled} />
      </label>
      {coverFile && <button type="button" className={styles.coverRemoveFileBtn} onClick={onClearFile} disabled={disabled}>Remover arquivo</button>}
      {fileError && <p className={styles.errorText}>{fileError}</p>}
      <button type="button" className={styles.closeCoverEditBtn} onClick={onClose}>Fechar edição de capa</button>
    </div>
  );
}
