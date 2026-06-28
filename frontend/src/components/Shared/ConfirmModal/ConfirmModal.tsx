import { useId } from 'react';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import styles from '@/components/Shared/ConfirmModal/ConfirmModal.module.css';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = false,
}: Props) {
  const reactId = useId();
  const titleId = `confirm-modal-title-${reactId}`;
  const messageId = `confirm-modal-message-${reactId}`;

  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      maxWidth="400px"
      titleId={titleId}
      descriptionId={messageId}
    >
      <div className={styles.body}>
        <h3 className={styles.title} id={titleId}>{title}</h3>
        <p className={styles.message} id={messageId}>{message}</p>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}