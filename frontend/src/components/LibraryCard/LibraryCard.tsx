import { createElement, type KeyboardEvent } from 'react';
import {
  CheckCircle2,
  Disc3,
  FileText,
  ShoppingCart,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { IconType } from 'react-icons';
import {
  FaAmazon,
  FaAppStoreIos,
  FaGooglePlay,
  FaItchIo,
  FaPlaystation,
  FaSteam,
  FaXbox,
} from 'react-icons/fa6';
import { SiEa, SiEpicgames, SiGogdotcom, SiUbisoft } from 'react-icons/si';
import { TbDeviceNintendo } from 'react-icons/tb';
import Card from '@/components/Shared/Card/Card';
import styles from '@/components/LibraryCard/LibraryCard.module.css';

import { getStoreLabel, normalizeStoreKey } from '@/types/enums';

interface Props {
  title: string;
  coverUrl: string | undefined;
  status: string;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  platinumAt: string | null;
  store?: string | null;
  favorite?: boolean;
  onClick: () => void;
}

const STATUS_CLASSES: Record<string, string> = {
  'Na biblioteca': styles.statusInLibrary,
  'Quero Jogar': styles.statusWantToPlay,
  'Jogando': styles.statusPlaying,
  'Zerado': styles.statusCompleted,
  'Platinado': styles.statusPlatinized,
  'Abandonado': styles.statusAbandoned,
  'Em Espera': styles.statusOnHold,
};

const STORE_ICONS: Record<string, IconType | LucideIcon> = {
  STEAM: FaSteam,
  EPIC: SiEpicgames,
  GOG: SiGogdotcom,
  ITCH: FaItchIo,
  PS_STORE: FaPlaystation,
  XBOX: FaXbox,
  NINTENDO: TbDeviceNintendo,
  EA_APP: SiEa,
  UBISOFT: SiUbisoft,
  AMAZON: FaAmazon,
  GOOGLE_PLAY: FaGooglePlay,
  APP_STORE: FaAppStoreIos,
  PHYSICAL: Disc3,
};

const getStoreIcon = (storeKey: string): IconType | LucideIcon =>
  STORE_ICONS[normalizeStoreKey(storeKey)] ?? ShoppingCart;

export default function LibraryCard({
  title,
  coverUrl,
  status,
  rating,
  finishedAt,
  platinumAt,
  store,
  favorite,
  onClick,
}: Props) {
  const finishedYear = finishedAt ? finishedAt.substring(0, 4) : null;
  const platinumYear = platinumAt ? platinumAt.substring(0, 4) : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={styles.libraryCard}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir detalhes de ${title}`}
    >
      <div className={styles.imageWrapper}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className={styles.cover} />
        ) : (
          <div className={styles.coverFallback}>Sem Imagem</div>
        )}
        {store && (
          <div className={styles.storeTag} title={`Adquirido na ${getStoreLabel(store)}`}>
            {createElement(getStoreIcon(store), { 'aria-hidden': true, size: 14 })} {getStoreLabel(store)}
          </div>
        )}
        {favorite && (
          <div className={styles.favoriteBadge} title="Jogo Favorito">
            <Star aria-hidden="true" fill="currentColor" size={16} />
          </div>
        )}
        <span className={`${styles.statusTag} ${STATUS_CLASSES[status] ?? styles.statusWantToPlay}`}>
          {status}
        </span>
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.meta}>
          <span className={styles.metaLeft}>
            {rating !== null && <><FileText aria-hidden="true" size={14} /> {rating}/10</>}
          </span>
          <span className={styles.metaCenter}>
            {finishedYear && <><CheckCircle2 aria-hidden="true" size={14} /> {finishedYear}</>}
          </span>
          <span className={styles.metaRight}>
            {platinumYear && <><Trophy aria-hidden="true" size={14} /> {platinumYear}</>}
          </span>
        </div>
      </div>
    </Card>
  );
}
