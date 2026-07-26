import { useState, FormEvent } from 'react';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import api from '@/services/api';
import styles from './FeedbackModal.module.css';

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const { showToast } = useToast();
  const confirmSendModal = useConfirmAction();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }
    confirmSendModal.open();
  };

  const handleConfirmSend = async () => {
    confirmSendModal.close();
    setIsSubmitting(true);
    try {
      await api.post('/users/feedback', {
        title: title.trim(),
        description: description.trim(),
      });
      showToast('Feedback enviado com sucesso! Obrigado pelo contato.', 'success');
      onClose();
    } catch {
      showToast('Erro ao enviar feedback. Tente novamente mais tarde.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal open={true} onClose={onClose} maxWidth="550px">
        <div className={styles.container}>
          <h2 className={styles.modalTitle}>Enviar Feedback</h2>
          <p className={styles.modalSubtitle}>
            Compartilhe suas ideias, reporte bugs ou sugira melhorias para o VisualMemory.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              <div className={styles.labelHeader}>
                <span>Título</span>
                <span className={styles.charCount}>{title.length}/100</span>
              </div>
              <Input
                type="text"
                placeholder="Ex: Sugestão para novas listas, Erro de login"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={100}
                autoFocus
              />
            </label>

            <label className={styles.label}>
              <div className={styles.labelHeader}>
                <span>Descrição</span>
                <span className={styles.charCount}>{description.length}/2000</span>
              </div>
              <textarea
                className={styles.textarea}
                placeholder="Descreva seu feedback em detalhes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isSubmitting}
                rows={6}
                maxLength={2000}
              />
            </label>

            <div className={styles.footerButtons}>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmSendModal.isOpen}
        title="Enviar Feedback"
        message="Deseja realmente enviar este feedback?"
        confirmText="Sim, enviar"
        cancelText="Cancelar"
        onConfirm={handleConfirmSend}
        onCancel={confirmSendModal.close}
      />
    </>
  );
}
