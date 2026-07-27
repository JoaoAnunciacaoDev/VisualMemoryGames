import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/Shared';
import styles from '@/pages/TierListEditor/TierListEditor.module.css';

interface Props {
  title: string;
  editingTitle: boolean;
  onEditTitle: () => void;
  onTitleChange: (value: string) => void;
  onTitleSave: () => void;
  onAddGame: () => void;
  isPublic: boolean;
  onTogglePrivacy: () => void;
  isOwner: boolean;
  ownerUsername?: string;
}

export default function TierListEditorHeader({
  title,
  editingTitle,
  onEditTitle,
  onTitleChange,
  onTitleSave,
  onAddGame,
  isPublic,
  onTogglePrivacy,
  isOwner,
  ownerUsername,
}: Props) {
  return (
    <div className={styles.header}>
      {isOwner ? (
        editingTitle ? (
          <Input
            className={styles.titleInput}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={onTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && onTitleSave()}
            autoFocus
          />
        ) : (
          <h2 className={styles.title} onDoubleClick={onEditTitle}>
            {title}
          </h2>
        )
      ) : (
        <div className={styles.titleArea}>
          <h2 className={styles.title}>{title}</h2>
          {ownerUsername && (
            <span className={styles.ownerText}>
              Criada por <Link to={`/profile/${ownerUsername}`}>@{ownerUsername}</Link>
            </span>
          )}
        </div>
      )}

      {isOwner && (
        <div className={styles.headerActions}>
          <Button
            variant={isPublic ? 'secondary' : 'primary'}
            className={styles.privacyButton}
            onClick={onTogglePrivacy}
          >
            {isPublic ? 'Público' : 'Privado'}
          </Button>
          <Button
            variant="primary"
            className={styles.addGameButton}
            onClick={onAddGame}
          >
            + Adicionar Jogo
          </Button>
        </div>
      )}
    </div>
  );
}