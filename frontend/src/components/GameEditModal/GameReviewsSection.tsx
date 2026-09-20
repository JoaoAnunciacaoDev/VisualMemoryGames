import { useState } from 'react';
import { Star } from 'lucide-react';
import Button from '@/components/Shared/Button/Button';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import styles from './GameEditModal.module.css';
import ReviewMarkdown from './ReviewMarkdown';
import type { GameReviewsController } from './useGameReviews';

interface Props {
  controller: GameReviewsController;
  rating: number | null | undefined;
  disabled: boolean;
}

const formatReviewDate = (date: string) => new Date(date).toLocaleString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function GameReviewsSection({ controller, rating, disabled }: Props) {
  const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!reviewIdToDelete) return;
    await controller.remove(reviewIdToDelete);
    setReviewIdToDelete(null);
  };

  return (
    <div className={styles.reviewsWrapper}>
      <div id="review-form-anchor" className={styles.reviewFormBox}>
        <h4 className={styles.reviewFormTitle}>{controller.editingReviewId ? 'Editar Avaliação' : 'Escrever Nova Avaliação'}</h4>
        <div className={styles.reviewFormRatingReadOnly}>
          Nota vinculada:{' '}
          <strong className={styles.ratingHighlight}>
            {rating !== null && rating !== undefined ? <><Star aria-hidden="true" size={14} /> {rating.toFixed(1)}/10</> : 'Sem nota'}
          </strong>
        </div>
        <textarea
          className={`${styles.reviewTextarea} scrollbar-visualmemory`}
          value={controller.notes}
          onChange={(event) => controller.setNotes(event.target.value)}
          placeholder="Escreva sua avaliação em Markdown (suporta negrito, listas, títulos)..."
          rows={4}
          disabled={disabled}
        />
        <div className={styles.reviewFormActionButtons}>
          <Button variant="primary" onClick={() => void controller.save()} disabled={disabled || (rating === null && !controller.notes.trim())}>
            {controller.editingReviewId ? 'Salvar Alterações' : 'Adicionar Avaliação'}
          </Button>
          {controller.editingReviewId && <Button variant="ghost" onClick={controller.cancelEditing} disabled={disabled}>Cancelar</Button>}
        </div>
      </div>

      <div className={styles.reviewsHistoryHeader}>
        <span className={styles.reviewsHistoryTitle}>Histórico de Notas e Comentários ({controller.reviews.length})</span>
        <button type="button" className={styles.toggleHistoryBtn} onClick={() => controller.setShowHistory(!controller.showHistory)}>
          {controller.showHistory ? 'Ocultar histórico' : 'Mostrar histórico'}
        </button>
      </div>

      {controller.showHistory && (
        <div className={styles.timelineList}>
          {controller.isLoading ? <div className={styles.reviewsLoadingMessage}>Carregando avaliações...</div>
            : controller.reviews.length === 0 ? <div className={styles.noReviewsMessage}>Nenhuma avaliação registrada ainda.</div>
              : (
                <div className={styles.timelineContainer}>
                  {controller.reviews.map((review) => {
                    const createdAt = formatReviewDate(review.created_at);
                    const updatedAt = formatReviewDate(review.updated_at);
                    const isEdited = new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 5000;
                    return (
                      <div key={review.id} className={styles.timelineItem}>
                        <div className={styles.timelinePoint} />
                        <div className={styles.timelineCard}>
                          <div className={styles.timelineCardHeader}>
                            <div className={styles.timelineRatingBadge}>{review.rating !== null ? <><Star aria-hidden="true" size={14} /> {review.rating.toFixed(1)}/10</> : 'Sem nota'}</div>
                            <div className={styles.timelineDate}>
                              Avaliado em {createdAt}
                              {isEdited && <span className={styles.editedTag} title={`Editado em ${updatedAt}`}>&nbsp;• (Editado em {updatedAt})</span>}
                            </div>
                            <div className={styles.timelineActions}>
                              <button type="button" className={styles.timelineActionBtn} onClick={() => controller.startEditing(review)} disabled={disabled}>Editar</button>
                              <button type="button" className={`${styles.timelineActionBtn} ${styles.timelineActionBtnDelete}`} onClick={() => setReviewIdToDelete(review.id)} disabled={disabled}>Excluir</button>
                            </div>
                          </div>
                          {review.notes && <ReviewMarkdown markdown={review.notes} className={styles.timelineContent} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>
      )}

      <ConfirmModal
        isOpen={reviewIdToDelete !== null}
        title="Excluir Avaliação"
        message="Tem certeza que deseja excluir esta avaliação do histórico? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        isDestructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setReviewIdToDelete(null)}
      />
    </div>
  );
}
