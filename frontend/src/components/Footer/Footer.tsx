import { useState } from 'react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import FeedbackModal from '@/components/FeedbackModal/FeedbackModal';
import styles from '@/components/Footer/Footer.module.css';

export default function Footer() {
  const { user } = useAuth();
  const token = !!user;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.leftSection}>
          <p className={styles.text}>
            © {new Date().getFullYear()} VisualMemory. Todos os direitos reservados.
          </p>
          {token && (
            <button
              type="button"
              className={styles.feedbackLink}
              onClick={() => setFeedbackOpen(true)}
            >
              Feedback
            </button>
          )}
        </div>
        <div className={styles.socials}>
          <p className={styles.text}>Por João Victor Anunciação da Silva</p>
          <a href="https://github.com/JoaoAnunciacaoDev" target="_blank" rel="noopener noreferrer" className={styles.link} aria-label="GitHub">
            <FaGithub size={20} />
          </a>
          <a href="https://linkedin.com/in/joao-victor-anunciacao" target="_blank" rel="noopener noreferrer" className={styles.link} aria-label="LinkedIn">
            <FaLinkedin size={20} />
          </a>
        </div>
      </footer>

      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} />
      )}
    </>
  );
}