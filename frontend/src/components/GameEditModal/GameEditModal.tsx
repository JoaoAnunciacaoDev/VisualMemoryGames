import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Button from '@/components/Shared/Button/Button';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import Modal from '@/components/Shared/Modal/Modal';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useGameEditForm } from '@/hooks/useGameEditForm';
import { useToast } from '@/hooks/useToast';
import styles from '@/components/GameEditModal/GameEditModal.module.css';
import { LibraryGame, UserGameReview } from '@/types';
import { STORE_OPTIONS } from '@/types/enums';
import { EditGamePayload } from '@/hooks/useGameEditForm';
import RatingStars from '@/components/RatingStars/RatingStars';
import { STANDARD_GENRES } from '@/utils/genres';
import { STANDARD_PLATFORMS } from '@/utils/platforms';
import api from '@/services/api';

function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^(<h|<ul|<ol|<li|<blockquote|<pre)/i.test(p)) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br />')}</p>`;
  }).join('\n');

  return html;
}

export default function GameEditModal({ game, onSave, onRemove, onClose }: { game: LibraryGame; onSave: (data: EditGamePayload) => Promise<void>; onRemove: () => Promise<void>; onClose: () => void; }) {
  const { showToast } = useToast();
  const {
    form,
    coverFile,
    fileError,
    editTitle,
    setEditTitle,
    editReleaseYear,
    setEditReleaseYear,
    editPlatforms,
    setEditPlatforms,
    editGenres,
    setEditGenres,
    canReview,
    updateField,
    handleStatusChange,
    handleFileChange,
    handleUrlChange,
    clearCoverFile,
    handleSave,
    displayCover,
  } = useGameEditForm(game);

  const [activeEditField, setActiveEditField] = useState<string | null>(null);
  const toggleEditField = (field: string) => {
    setActiveEditField((prev) => (prev === field ? null : field));
  };

  // Multiple Reviews state
  const [reviews, setReviews] = useState<UserGameReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Review form states
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewSaving, setIsReviewSaving] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/user-games/${game.id}/reviews`);
      const reviewsList = res.data;
      setReviews(reviewsList);

      // Sincronizar form principal com a avaliação mais recente
      const latest = reviewsList[0];
      if (latest) {
        updateField('rating', latest.rating);
        updateField('notes', latest.notes);
      } else {
        updateField('rating', null);
        updateField('notes', null);
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [game.id, updateField]);

  useEffect(() => {
    if (game.id) {
      Promise.resolve().then(() => {
        fetchReviews();
        setEditingReviewId(null);
        setReviewNotes('');
      });
    }
  }, [game.id, fetchReviews]);

  const handleSaveReview = async () => {
    if (form.rating === null && !reviewNotes.trim()) {
      showToast('Adicione uma nota (no topo do modal) ou um comentário para salvar a avaliação.', 'error');
      return;
    }

    setIsReviewSaving(true);
    try {
      if (editingReviewId) {
        await api.put(`/user-games/${game.id}/reviews/${editingReviewId}`, {
          rating: form.rating,
          notes: reviewNotes.trim() || null,
        });
        showToast('Avaliação atualizada com sucesso!', 'success');
      } else {
        await api.post(`/user-games/${game.id}/reviews`, {
          rating: form.rating,
          notes: reviewNotes.trim() || null,
        });
        showToast('Avaliação adicionada com sucesso!', 'success');
      }
      setReviewNotes('');
      setEditingReviewId(null);
      await fetchReviews();
    } catch {
      showToast('Erro ao salvar avaliação.', 'error');
    } finally {
      setIsReviewSaving(false);
    }
  };

  const handleEditReviewClick = (rev: UserGameReview) => {
    setEditingReviewId(rev.id);
    setReviewNotes(rev.notes ?? '');
    // Rolar suavemente para o formulário de avaliação
    const formElement = document.getElementById('review-form-anchor');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setIsReviewSaving(true);
    try {
      await api.delete(`/user-games/${game.id}/reviews/${reviewId}`);
      showToast('Avaliação excluída com sucesso!', 'success');
      if (editingReviewId === reviewId) {
        setEditingReviewId(null);
        setReviewNotes('');
      }
      await fetchReviews();
    } catch {
      showToast('Erro ao excluir avaliação.', 'error');
    } finally {
      setIsReviewSaving(false);
    }
  };

  const handleConfirmDeleteReview = async () => {
    if (reviewIdToDelete) {
      await handleDeleteReview(reviewIdToDelete);
      confirmDeleteReviewModal.close();
      setReviewIdToDelete(null);
    }
  };

  const handleCancelEditReview = () => {
    setEditingReviewId(null);
    setReviewNotes('');
  };



  const [genreSearch, setGenreSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const customGenres = editGenres.filter((id) => !STANDARD_GENRES.some((g) => g.id === id));
  const AVAILABLE_GENRES = [
    ...STANDARD_GENRES,
    ...customGenres.map((id) => ({ id, label: id })),
  ];

  const filteredGenres = AVAILABLE_GENRES.filter((genre) => {
    const matchesSearch = genre.label.toLowerCase().includes(genreSearch.toLowerCase()) || 
                          genre.id.toLowerCase().includes(genreSearch.toLowerCase());
    const notSelected = !editGenres.includes(genre.id);
    return matchesSearch && notSelected;
  });

  const showCustomOption = 
    genreSearch.trim() !== '' &&
    !editGenres.some(g => g.toLowerCase() === genreSearch.trim().toLowerCase()) &&
    !AVAILABLE_GENRES.some(g => g.label.toLowerCase() === genreSearch.trim().toLowerCase() || g.id.toLowerCase() === genreSearch.trim().toLowerCase());

  const [platformSearch, setPlatformSearch] = useState('');
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);

  const filteredPlatforms = STANDARD_PLATFORMS.filter((platform) => {
    const matchesSearch = platform.label.toLowerCase().includes(platformSearch.toLowerCase()) || 
                          platform.id.toLowerCase().includes(platformSearch.toLowerCase());
    const notSelected = editPlatforms.includes(platform.id);
    return matchesSearch && !notSelected;
  });

  const showCustomPlatformOption = 
    platformSearch.trim() !== '' &&
    !editPlatforms.some(p => p.toLowerCase() === platformSearch.trim().toLowerCase()) &&
    !STANDARD_PLATFORMS.some(p => p.label.toLowerCase() === platformSearch.trim().toLowerCase() || p.id.toLowerCase() === platformSearch.trim().toLowerCase());

  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const confirmRemoveModal = useConfirmAction();
  const confirmDeleteReviewModal = useConfirmAction();
  const [reviewIdToDelete, setReviewIdToDelete] = useState<string | null>(null);

  const onSaveHandler = async () => {
    setIsSaving(true);
    try {
      const payload = await handleSave();
      await onSave(payload);
    } catch (err) {
      let message = 'Erro ao salvar alterações.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((d: { msg?: string }) => d.msg || '').join('\n');
        } else if (err.response?.data?.message) {
          message = err.response.data.message;
        } else if (err.message) {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      setIsRemoving(false);
      confirmRemoveModal.close();
    }
  };

  const isBusy = isSaving || isRemoving || isReviewSaving || reviewsLoading;

  // Format date helper for view mode
  const formatDateForView = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Não informada';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <Modal open onClose={() => !isBusy && onClose()} maxWidth="720px" showCloseButton={false}>
      <div className={styles.modalContent}>
        
        {/* Custom Header Section */}
        <div className={styles.customHeader}>
          <div className={styles.gameInfo}>
            <div className={styles.coverWrapper} onClick={() => !isBusy && toggleEditField('cover')}>
              {displayCover ? (
                <img src={displayCover} alt={game.title} className={styles.cover} />
              ) : (
                <div className={styles.coverPlaceholderSmall}>Sem capa</div>
              )}
              <div className={styles.coverHoverOverlay}>
                <span className={styles.coverPencilIcon}>✏️</span>
                <span className={styles.coverHoverTooltip}>Alterar capa</span>
              </div>
            </div>
            <div className={styles.titleAndStatus}>
              
              {/* Game Title with click to edit (for manual games) */}
              {game.is_manual ? (
                activeEditField === 'title' ? (
                  <input
                    type="text"
                    className={styles.headerTitleInput}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => toggleEditField('title')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') toggleEditField('title');
                    }}
                    disabled={isBusy}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h2 
                    className={`${styles.title} ${styles.editableHeaderField}`} 
                    onClick={() => toggleEditField('title')}
                  >
                    {editTitle}
                  </h2>
                )
              ) : (
                <h2 className={styles.title}>{game.title}</h2>
              )}

              {/* Game Release Year (with click to edit for manual games) */}
              {game.is_manual ? (
                activeEditField === 'release_year' ? (
                  <input
                    type="number"
                    className={styles.headerYearInput}
                    value={editReleaseYear}
                    onChange={(e) => setEditReleaseYear(e.target.value)}
                    onBlur={() => toggleEditField('release_year')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') toggleEditField('release_year');
                    }}
                    min={1}
                    max={new Date().getFullYear() + 10}
                    disabled={isBusy}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    className={`${styles.headerYear} ${styles.editableHeaderField}`}
                    onClick={() => toggleEditField('release_year')}
                  >
                    {editReleaseYear || 'Adicionar ano'}
                  </span>
                )
              ) : (
                game.release_year && (
                  <span className={styles.headerYear}>{game.release_year}</span>
                )
              )}

              <span className={`${styles.statusTag} ${styles[`status_${(form.status || 'Quero Jogar').replace(/\s+/g, '_')}`]}`}>
                {(form.status || 'Quero Jogar').toUpperCase()}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.favoriteHeaderBtn}
              onClick={() => updateField('favorite', !form.favorite)}
              disabled={isBusy}
              title={form.favorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            >
              {form.favorite ? '⭐' : '☆'}
            </button>
            <button
              type="button"
              className={styles.closeHeaderBtn}
              onClick={onClose}
              disabled={isSaving || isRemoving}
              title="Fechar"
              autoFocus
            >
              X
            </button>
          </div>
        </div>

        <div className={`${styles.fields} scrollbar-visualmemory`}>
          
          {/* Cover Edit Section (Inline at the top) */}
          {activeEditField === 'cover' && (
            <div className={styles.coverEditBox}>
              <div className={styles.coverInputRow}>
                <span className={styles.coverInputLabel}>🔗 CAPA POR URL</span>
                <input
                  type="url"
                  className={styles.coverUrlInput}
                  value={form.custom_cover_url ?? ''}
                  onChange={handleUrlChange}
                  placeholder="https://exemplo.com/capa.jpg"
                  disabled={!!coverFile || isBusy}
                />
              </div>
              <div className={styles.coverOrDivider}>
                <span>ou</span>
              </div>
              <label className={`${styles.coverUploadZone} ${isBusy ? styles.disabledUpload : ''}`}>
                <span className={styles.uploadText}>
                  {coverFile ? coverFile.name : 'Escolher arquivo do PC'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.fileInputHidden}
                  disabled={isBusy}
                />
              </label>
              {coverFile && (
                <button
                  type="button"
                  className={styles.coverRemoveFileBtn}
                  onClick={() => {
                    clearCoverFile();
                  }}
                  disabled={isBusy}
                >
                  Remover arquivo
                </button>
              )}
              {fileError && <p className={styles.errorText}>{fileError}</p>}
              <button
                type="button"
                className={styles.closeCoverEditBtn}
                onClick={() => setActiveEditField(null)}
              >
                Fechar edição de capa
              </button>
            </div>
          )}

          {/* Status block including Store and Hours below divider */}
          <div className={styles.statusSection}>
            <span className={styles.statusSectionLabel}>Status</span>
            <div className={styles.statusButtonsGrid}>
              {[
                { name: 'Quero Jogar', icon: '🎯', class: 'wantToPlay' },
                { name: 'Jogando', icon: '🎮', class: 'playing' },
                { name: 'Zerado', icon: '✅', class: 'completed' },
                { name: 'Em Espera', icon: '⏸️', class: 'onHold' },
                { name: 'Abandonado', icon: '🚫', class: 'abandoned' },
                { name: 'Platinado', icon: '🏆', class: 'platinized' },
              ].map((item) => {
                const isSelected = (form.status || 'Quero Jogar') === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`${styles.statusGridBtn} ${isSelected ? styles[`statusGridBtn_${item.class}`] : ''}`}
                    onClick={() => {
                      handleStatusChange(item.name);
                    }}
                    disabled={isBusy}
                  >
                    <span className={styles.statusBtnIcon}>{item.icon}</span>
                    <span className={styles.statusBtnName}>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Divider Rule separating Status Grid from Store & Hours */}
            <hr className={styles.statusSectionDivider} />

            {/* Store & Hours Inline Layout */}
            <div className={styles.storeAndHoursRow}>
              
              {/* LOJA field with click to edit */}
              <div 
                className={`${styles.storeFieldBlock} ${activeEditField === 'store' ? styles.fieldBlockEditing : ''}`}
                onClick={() => toggleEditField('store')}
              >
                <span className={styles.fieldBlockLabel}>Loja</span>
                {activeEditField === 'store' ? (
                  <select
                    className={styles.gridSelect}
                    value={form.store ?? ''}
                    onChange={(e) => {
                      updateField('store', e.target.value || null);
                      toggleEditField('store');
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isBusy}
                    autoFocus
                  >
                    <option value="">Selecione...</option>
                    {STORE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.gridTextValue}>
                    {STORE_OPTIONS.find(o => o.value === form.store)?.label || 'Não informada'}
                  </div>
                )}
              </div>

              {/* HORAS JOGADAS field with click to edit */}
              {canReview && (
                <div 
                  className={`${styles.hoursFieldBlock} ${activeEditField === 'hours_played' ? styles.fieldBlockEditing : ''}`}
                  onClick={() => toggleEditField('hours_played')}
                >
                  <span className={styles.fieldBlockLabel}>⏱️ Horas jogadas</span>
                  {activeEditField === 'hours_played' ? (
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className={styles.gridInput}
                      value={form.hours_played ?? ''}
                      onChange={(e) =>
                        updateField('hours_played', e.target.value === '' ? null : Number(e.target.value))
                      }
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => toggleEditField('hours_played')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') toggleEditField('hours_played');
                      }}
                      disabled={isBusy}
                      autoFocus
                    />
                  ) : (
                    <div className={styles.gridTextValue}>
                      {form.hours_played !== null ? `${form.hours_played}h` : 'Não informadas'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dates Card Grid with click to edit */}
          <div className={styles.datesCardBlock}>
            <div className={styles.datesHeader}>
              <span>📅 Datas</span>
            </div>
            <div className={styles.datesGrid}>
              
              <div 
                className={`${styles.dateInputWrapper} ${activeEditField === 'acquired_at' ? styles.dateInputWrapperEditing : ''}`}
                onClick={() => toggleEditField('acquired_at')}
              >
                <span className={styles.dateLabel}>Adquirido em</span>
                {activeEditField === 'acquired_at' ? (
                  <input
                    type="date"
                    max="9999-12-31"
                    className={styles.dateInputField}
                    value={form.acquired_at ?? ''}
                    onChange={(e) => updateField('acquired_at', e.target.value || null)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => toggleEditField('acquired_at')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') toggleEditField('acquired_at');
                    }}
                    disabled={isBusy}
                    autoFocus
                  />
                ) : (
                  <div className={styles.gridTextValue}>
                    {formatDateForView(form.acquired_at)}
                  </div>
                )}
              </div>

              {canReview && (
                <div 
                  className={`${styles.dateInputWrapper} ${activeEditField === 'started_at' ? styles.dateInputWrapperEditing : ''}`}
                  onClick={() => toggleEditField('started_at')}
                >
                  <span className={styles.dateLabel}>Data de início</span>
                  {activeEditField === 'started_at' ? (
                    <input
                      type="date"
                      max="9999-12-31"
                      className={styles.dateInputField}
                      value={form.started_at ?? ''}
                      onChange={(e) => updateField('started_at', e.target.value || null)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => toggleEditField('started_at')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') toggleEditField('started_at');
                      }}
                      disabled={isBusy}
                      autoFocus
                    />
                  ) : (
                    <div className={styles.gridTextValue}>
                      {formatDateForView(form.started_at)}
                    </div>
                  )}
                </div>
              )}

              {canReview && ((form.status || 'Quero Jogar') === 'Zerado' || (form.status || 'Quero Jogar') === 'Platinado') && (
                <div 
                  className={`${styles.dateInputWrapper} ${activeEditField === 'finished_at' ? styles.dateInputWrapperEditing : ''}`}
                  onClick={() => toggleEditField('finished_at')}
                >
                  <span className={styles.dateLabel}>Data de conclusão</span>
                  {activeEditField === 'finished_at' ? (
                    <input
                      type="date"
                      max="9999-12-31"
                      className={styles.dateInputField}
                      value={form.finished_at ?? ''}
                      onChange={(e) => updateField('finished_at', e.target.value || null)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => toggleEditField('finished_at')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') toggleEditField('finished_at');
                      }}
                      disabled={isBusy}
                      autoFocus
                    />
                  ) : (
                    <div className={styles.gridTextValue}>
                      {formatDateForView(form.finished_at)}
                    </div>
                  )}
                </div>
              )}

              {canReview && (form.status || 'Quero Jogar') === 'Platinado' && (
                <div 
                  className={`${styles.dateInputWrapper} ${activeEditField === 'platinum_at' ? styles.dateInputWrapperEditing : ''}`}
                  onClick={() => toggleEditField('platinum_at')}
                >
                  <span className={styles.dateLabel}>Platinado em</span>
                  {activeEditField === 'platinum_at' ? (
                    <input
                      type="date"
                      max="9999-12-31"
                      className={styles.dateInputField}
                      value={form.platinum_at ?? ''}
                      onChange={(e) => updateField('platinum_at', e.target.value || null)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => toggleEditField('platinum_at')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') toggleEditField('platinum_at');
                      }}
                      disabled={isBusy}
                      autoFocus
                    />
                  ) : (
                    <div className={styles.gridTextValue}>
                      {formatDateForView(form.platinum_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rating Section ("Sua Nota") */}
          <div className={styles.ratingCardBox}>
            <span className={styles.ratingBoxSubtitle}>Sua nota</span>
            {canReview ? (
              <div className={styles.ratingStarsArea}>
                <RatingStars
                  value={form.rating ?? null}
                  onChange={(value: number) => updateField('rating', value)}
                  disabled={isBusy}
                />
                <div className={styles.ratingValueLabel}>
                  {form.rating !== null && form.rating !== undefined ? `${form.rating.toFixed(1)} / 10` : 'Sem nota'}
                </div>
                {form.rating !== null && form.rating !== undefined && (
                  <button
                    type="button"
                    className={styles.clearRatingBtn}
                    onClick={() => updateField('rating', null)}
                    disabled={isBusy}
                  >
                    Remover nota
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.disabledRatingArea}>
                Mude o status para avaliar
              </div>
            )}
          </div>

          {/* Platforms & Genres Row */}
          <div className={styles.platformsAndGenresRow}>
            {/* PLATFORMS */}
            <div 
              className={`${styles.tagBlock} ${activeEditField === 'platforms' ? styles.tagBlockEditing : ''}`}
              onClick={() => {
                if (game.is_manual) toggleEditField('platforms');
              }}
            >
              <div className={styles.tagBlockHeader}>
                <span className={styles.tagBlockTitle}>Plataformas</span>
              </div>
              <div className={styles.tagBlockContent}>
                {editPlatforms.map((p) => {
                  const label = STANDARD_PLATFORMS.find((sp) => sp.id === p)?.label ?? p;
                  return (
                    <span key={p} className={styles.tagBadge}>
                      {label}
                      {game.is_manual && (
                        <button
                          type="button"
                          className={styles.removeTagIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditPlatforms(editPlatforms.filter((id) => id !== p));
                          }}
                          disabled={isBusy}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
                {game.is_manual && (
                  <button
                    type="button"
                    className={styles.addTagButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEditField('platforms');
                    }}
                  >
                    + Adicionar
                  </button>
                )}
              </div>
              {activeEditField === 'platforms' && game.is_manual && (
                <div className={styles.dropdownWrapper} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Pesquisar ou adicionar plataforma..."
                    className={styles.tagSearchInput}
                    value={platformSearch}
                    onChange={(e) => setPlatformSearch(e.target.value)}
                    onFocus={() => setIsPlatformDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsPlatformDropdownOpen(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = platformSearch.trim();
                        if (trimmed) {
                          const matchedStandard = STANDARD_PLATFORMS.find(
                            (p) => p.label.toLowerCase() === trimmed.toLowerCase() || p.id.toLowerCase() === trimmed.toLowerCase()
                          );
                          const platformToAdd = matchedStandard ? matchedStandard.id : trimmed;
                          if (!editPlatforms.includes(platformToAdd)) {
                            setEditPlatforms([...editPlatforms, platformToAdd]);
                          }
                          setPlatformSearch('');
                        }
                      }
                    }}
                    disabled={isBusy}
                    autoFocus
                  />
                  {isPlatformDropdownOpen && (filteredPlatforms.length > 0 || showCustomPlatformOption) && (
                    <div className={`${styles.dropdownList} scrollbar-visualmemory`}>
                      {filteredPlatforms.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          className={styles.dropdownItem}
                          onMouseDown={() => {
                            setEditPlatforms([...editPlatforms, platform.id]);
                            setPlatformSearch('');
                          }}
                        >
                          {platform.label}
                        </button>
                      ))}
                      {showCustomPlatformOption && (
                        <button
                          type="button"
                          className={`${styles.dropdownItem} ${styles.customItem}`}
                          onMouseDown={() => {
                            setEditPlatforms([...editPlatforms, platformSearch.trim()]);
                            setPlatformSearch('');
                          }}
                        >
                          + Adicionar "{platformSearch.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GENRES */}
            <div 
              className={`${styles.tagBlock} ${activeEditField === 'genres' ? styles.tagBlockEditing : ''}`}
              onClick={() => {
                if (game.is_manual) toggleEditField('genres');
              }}
            >
              <div className={styles.tagBlockHeader}>
                <span className={styles.tagBlockTitle}>Gêneros</span>
              </div>
              <div className={styles.tagBlockContent}>
                {editGenres.map((g) => {
                  const label = STANDARD_GENRES.find((sg) => sg.id === g)?.label ?? g;
                  return (
                    <span key={g} className={styles.tagBadge}>
                      {label}
                      {game.is_manual && (
                        <button
                          type="button"
                          className={styles.removeTagIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditGenres(editGenres.filter((id) => id !== g));
                          }}
                          disabled={isBusy}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
                {game.is_manual && (
                  <button
                    type="button"
                    className={styles.addTagButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEditField('genres');
                    }}
                  >
                    + Adicionar
                  </button>
                )}
              </div>
              {activeEditField === 'genres' && game.is_manual && (
                <div className={styles.dropdownWrapper} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Pesquisar ou adicionar gênero..."
                    className={styles.tagSearchInput}
                    value={genreSearch}
                    onChange={(e) => setGenreSearch(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsDropdownOpen(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = genreSearch.trim();
                        if (trimmed) {
                          const matchedStandard = STANDARD_GENRES.find(
                            (g) => g.label.toLowerCase() === trimmed.toLowerCase() || g.id.toLowerCase() === trimmed.toLowerCase()
                          );
                          const genreToAdd = matchedStandard ? matchedStandard.id : trimmed;
                          if (!editGenres.includes(genreToAdd)) {
                            setEditGenres([...editGenres, genreToAdd]);
                          }
                          setGenreSearch('');
                        }
                      }
                    }}
                    disabled={isBusy}
                    autoFocus
                  />
                  {isDropdownOpen && (filteredGenres.length > 0 || showCustomOption) && (
                    <div className={`${styles.dropdownList} scrollbar-visualmemory`}>
                      {filteredGenres.map((genre) => (
                        <button
                          key={genre.id}
                          type="button"
                          className={styles.dropdownItem}
                          onMouseDown={() => {
                            setEditGenres([...editGenres, genre.id]);
                            setGenreSearch('');
                          }}
                        >
                          {genre.label}
                        </button>
                      ))}
                      {showCustomOption && (
                        <button
                          type="button"
                          className={`${styles.dropdownItem} ${styles.customItem}`}
                          onMouseDown={() => {
                            setEditGenres([...editGenres, genreSearch.trim()]);
                            setGenreSearch('');
                          }}
                        >
                          + Adicionar "{genreSearch.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Feed / Multiple Reviews Section */}
          {canReview && (
            <div className={styles.reviewsWrapper}>
              {/* Form de Avaliação (Escrever Nova / Editar Existente) */}
              <div id="review-form-anchor" className={styles.reviewFormBox}>
                <h4 className={styles.reviewFormTitle}>
                  {editingReviewId ? 'Editar Avaliação' : 'Escrever Nova Avaliação'}
                </h4>
                
                <div className={styles.reviewFormRatingReadOnly}>
                  Nota vinculada: <strong className={styles.ratingHighlight}>{form.rating !== null && form.rating !== undefined ? `⭐ ${form.rating.toFixed(1)}/10` : 'Sem nota'}</strong>
                </div>

                <textarea
                  className={`${styles.reviewTextarea} scrollbar-visualmemory`}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Escreva sua avaliação em Markdown (suporta negrito, listas, títulos)..."
                  rows={4}
                  disabled={isBusy}
                />

                <div className={styles.reviewFormActionButtons}>
                  <Button
                    variant="primary"
                    onClick={handleSaveReview}
                    disabled={isBusy || (form.rating === null && !reviewNotes.trim())}
                  >
                    {editingReviewId ? 'Salvar Alterações' : 'Adicionar Avaliação'}
                  </Button>
                  
                  {editingReviewId && (
                    <Button
                      variant="ghost"
                      onClick={handleCancelEditReview}
                      disabled={isBusy}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {/* Histórico Header & Toggle */}
              <div className={styles.reviewsHistoryHeader}>
                <span className={styles.reviewsHistoryTitle}>
                  Histórico de Notas e Comentários ({reviews.length})
                </span>
                <button
                  type="button"
                  className={styles.toggleHistoryBtn}
                  onClick={() => setShowHistory(prev => !prev)}
                >
                  {showHistory ? 'Ocultar histórico' : 'Mostrar histórico'}
                </button>
              </div>

              {/* Timeline List of Reviews */}
              {showHistory && (
                <div className={styles.timelineList}>
                  {reviewsLoading ? (
                    <div className={styles.reviewsLoadingMessage}>Carregando avaliações...</div>
                  ) : reviews.length === 0 ? (
                    <div className={styles.noReviewsMessage}>Nenhuma avaliação registrada ainda.</div>
                  ) : (
                    <div className={styles.timelineContainer}>
                      {reviews.map((rev) => {
                        const isEdited = new Date(rev.updated_at).getTime() - new Date(rev.created_at).getTime() > 5000;
                        const formattedCreatedDate = new Date(rev.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const formattedUpdatedDate = new Date(rev.updated_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={rev.id} className={styles.timelineItem}>
                            <div className={styles.timelinePoint} />
                            <div className={styles.timelineCard}>
                              <div className={styles.timelineCardHeader}>
                                <div className={styles.timelineRatingBadge}>
                                  {rev.rating !== null ? `⭐ ${rev.rating.toFixed(1)}/10` : 'Sem nota'}
                                </div>
                                <div className={styles.timelineDate}>
                                  Avaliado em {formattedCreatedDate}
                                  {isEdited && (
                                    <span className={styles.editedTag} title={`Editado em ${formattedUpdatedDate}`}>
                                      &nbsp;• (Editado em {formattedUpdatedDate})
                                    </span>
                                  )}
                                </div>
                                <div className={styles.timelineActions}>
                                  <button
                                    type="button"
                                    className={styles.timelineActionBtn}
                                    onClick={() => handleEditReviewClick(rev)}
                                    disabled={isBusy}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.timelineActionBtn} ${styles.timelineActionBtnDelete}`}
                                    onClick={() => {
                                      setReviewIdToDelete(rev.id);
                                      confirmDeleteReviewModal.open();
                                    }}
                                    disabled={isBusy}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>

                              {rev.notes && (
                                <div
                                  className={styles.timelineContent}
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(rev.notes) }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer buttons */}
        <div className={styles.footer}>
          <Button variant="primary" onClick={onSaveHandler} fullWidth disabled={isBusy} className={styles.gradientSaveBtn}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <button type="button" className={styles.removeButton} onClick={() => confirmRemoveModal.open()} disabled={isBusy}>
            {isRemoving ? 'Removendo...' : 'Remover da Biblioteca'}
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={confirmRemoveModal.isOpen}
        title="Remover Jogo"
        message={`Tem certeza que deseja remover "${game.title}" da sua biblioteca? Esta ação não pode ser desfeita.`}
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmRemove}
        onCancel={confirmRemoveModal.close}
      />
      <ConfirmModal
        isOpen={confirmDeleteReviewModal.isOpen}
        title="Excluir Avaliação"
        message="Tem certeza que deseja excluir esta avaliação do histórico? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => {
          confirmDeleteReviewModal.close();
          setReviewIdToDelete(null);
        }}
      />
    </Modal>
  );
}