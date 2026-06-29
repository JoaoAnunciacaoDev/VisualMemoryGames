import { useEffect, useRef, ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children:ReactNode;
  className?: string;
  maxWidth?: string;
  showCloseButton?: boolean;
  titleId?: string;
  descriptionId?: string;
}

export default function Modal({
  open,
  onClose,
  children,
  className = '',
  maxWidth = '500px',
  showCloseButton = true,
  titleId,
  descriptionId,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !modalRef.current) {
        return;
      }

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        [
          'button:not([disabled])',
          '[href]',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ')
      );

      if (focusableElements.length === 0) {
        e.preventDefault();
        modalRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    if (!open) {
      return;
    }

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
    window.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const autoFocusElement = modalRef.current?.querySelector<HTMLElement>('[autofocus]');
      if (autoFocusElement) {
        autoFocusElement.focus();
        return;
      }

      const focusableElement = modalRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusableElement?.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      previouslyFocusedElement.current?.focus();
      previouslyFocusedElement.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className={`${styles.modal} ${className}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar modal">
            X
          </button>
        )}
        {children}
      </div>
    </div>
  );
}