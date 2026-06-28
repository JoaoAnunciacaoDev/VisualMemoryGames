import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import styles from '@/pages/TierListEditor/TierListEditor.module.css';

interface Props {
  title: string;
  editingTitle: boolean;
  onEditTitle: () => void;
  onTitleChange: (value: string) => void;
  onTitleSave: () => void;
  onAddGame: () => void;
}

export default function TierListEditorHeader({
  title,
  editingTitle,
  onEditTitle,
  onTitleChange,
  onTitleSave,
  onAddGame,
}: Props) {
  return (
    <div className={styles.header}>
      {editingTitle ? (
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
      )}
      <Button
        variant="primary"
        className={styles.addGameButton}
        onClick={onAddGame}
      >
        + Adicionar Jogo
      </Button>
    </div>
  );
}