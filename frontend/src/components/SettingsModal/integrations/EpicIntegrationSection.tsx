import { Check, ChevronDown, ChevronRight, Clipboard, FolderOpen, Gamepad2, RefreshCw, Trash2 } from 'lucide-react';
import Button from '@/components/Shared/Button/Button';
import styles from '../SettingsModal.module.css';

interface Props {
  gamesCount: number | null;
  isFetching: boolean;
  isImporting: boolean;
  instructionsOpen: boolean;
  isCopiedScript: boolean;
  pastedText: string;
  parsedTitles: string[];
  isDragging: boolean;
  onInstructionsOpenChange: (open: boolean) => void;
  onDraggingChange: (dragging: boolean) => void;
  onCopyScript: () => void;
  onUploadFile: (file: File) => void;
  onContentChange: (content: string) => void;
  onImport: () => void;
  onEnrich: () => void;
  onRequestDelete: () => void;
}

export default function EpicIntegrationSection(props: Props) {
  const uploadFirstFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) props.onUploadFile(file);
  };

  return (
    <div className={styles.integrationSection}>
      <div className={styles.epicHeader}>
        <h3>Epic Games Store</h3>
        {props.gamesCount !== null && (
          <span className={styles.epicBadge}>{props.gamesCount} {props.gamesCount === 1 ? 'jogo na biblioteca' : 'jogos na biblioteca'}</span>
        )}
      </div>
      <p className={styles.helpText}>Importe sua biblioteca da Epic Games Store a partir de um arquivo TXT/CSV ou colando a lista de títulos.</p>

      {props.gamesCount !== null && props.gamesCount > 0 && (
        <div className={styles.epicManagementActions}>
          <Button type="button" variant="ghost" className={styles.syncAllButton} disabled={props.isFetching} onClick={props.onEnrich}>
            <RefreshCw aria-hidden="true" size={16} /> Atualizar Metadados (Capas e Gêneros)
          </Button>
          <Button type="button" variant="ghost" className={styles.disconnectButton} disabled={props.isFetching} onClick={props.onRequestDelete}>
            <Trash2 aria-hidden="true" size={16} /> Remover Jogos da Epic
          </Button>
        </div>
      )}

      <button type="button" className={styles.epicInstructionsToggle} onClick={() => props.onInstructionsOpenChange(!props.instructionsOpen)}>
        {props.instructionsOpen
          ? <><ChevronDown aria-hidden="true" size={16} /> Ocultar instruções de exportação</>
          : <><ChevronRight aria-hidden="true" size={16} /> Como exportar minha biblioteca da Epic?</>}
      </button>

      {props.instructionsOpen && (
        <div className={styles.epicInstructionsBox}>
          <ol className={styles.epicStepList}>
            <li>Acesse sua <a href="https://accounts.epicgames.com/account/transactions/purchases?productName=egs" target="_blank" rel="noopener noreferrer">Página de Transações da Epic Games ↗</a> no navegador.</li>
            <li>Abra as Ferramentas do Desenvolvedor pressionando <strong>F12</strong> e clique na aba <strong>Console</strong>.</li>
            <li>Clique no botão abaixo para copiar o script de exportação:</li>
          </ol>
          <div className={styles.epicScriptAction}>
            <Button type="button" variant="secondary" className={styles.copyScriptBtn} onClick={props.onCopyScript}>
              {props.isCopiedScript ? <><Check aria-hidden="true" size={16} /> Script Copiado!</> : <><Clipboard aria-hidden="true" size={16} /> Copiar Script de Exportação</>}
            </Button>
          </div>
          <ol className={styles.epicStepList} start={4} style={{ marginTop: 'var(--gap-sm)' }}>
            <li>Cole o script no console e pressione <strong>Enter</strong>.</li>
            <li>O download do arquivo <code>EpicGamesLibrary.txt</code> começará automaticamente.</li>
            <li>Arraste o arquivo baixado para a área de importação abaixo ou cole seu conteúdo!</li>
          </ol>
        </div>
      )}

      <div
        className={`${styles.dropZone} ${props.isDragging ? styles.dropZoneActive : ''}`}
        onDragOver={(event) => { event.preventDefault(); props.onDraggingChange(true); }}
        onDragLeave={() => props.onDraggingChange(false)}
        onDrop={(event) => { event.preventDefault(); props.onDraggingChange(false); uploadFirstFile(event.dataTransfer.files); }}
        onClick={() => document.getElementById('epic-file-input')?.click()}
      >
        <input
          id="epic-file-input"
          type="file"
          accept=".txt,.csv"
          className={styles.fileInputHidden}
          onChange={(event) => { uploadFirstFile(event.target.files); event.target.value = ''; }}
        />
        <span className={styles.dropZoneIcon}><FolderOpen aria-hidden="true" /></span>
        <p className={styles.dropZoneText}><strong>Clique para selecionar</strong> ou arraste seu <code>EpicGamesLibrary.txt</code> / <code>.csv</code></p>
        <p className={styles.dropZoneSubtext}>Suporta arquivos .txt e .csv gerados pelo script</p>
      </div>

      <div className={styles.epicTextareaDivider}>OU COLE A LISTA DE JOGOS</div>
      <textarea
        className={styles.epicTextarea}
        placeholder={'Cole os nomes dos jogos aqui (um por linha)...\nExemplo:\nControl\nDeath Stranding\nGTA V'}
        value={props.pastedText}
        onChange={(event) => props.onContentChange(event.target.value)}
        disabled={props.isImporting}
      />

      {props.parsedTitles.length > 0 && (
        <div className={styles.epicPreviewContainer}>
          <div className={styles.epicPreviewInfo}>
            <p className={styles.epicPreviewTitle}>
              <Gamepad2 aria-hidden="true" size={18} /> {props.parsedTitles.length} {props.parsedTitles.length === 1 ? 'jogo pronto para importação' : 'jogos prontos para importação'}
            </p>
            <p className={styles.epicPreviewSubtitle}>Serão adicionados à sua biblioteca com o status &quot;Na biblioteca&quot; e loja Epic Games.</p>
          </div>
          <div className={styles.epicPreviewActions}>
            <Button type="button" onClick={props.onImport} disabled={props.isImporting}>{props.isImporting ? 'Importando...' : 'Importar Jogos'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
