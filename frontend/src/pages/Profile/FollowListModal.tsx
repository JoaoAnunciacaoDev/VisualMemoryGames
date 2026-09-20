import React from 'react';
import { X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import styles from './FollowListModal.module.css';
import { Loader } from '@/components/Shared';
import {
  followListQuery,
  profileKeys,
  toggleProfileFollow,
  type UserPublicProfile,
} from '@/features/profile/queries';

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

const FollowListModal: React.FC<FollowListModalProps> = ({ userId, type, onClose }) => {
  const queryClient = useQueryClient();
  const usersQuery = useQuery(followListQuery(userId, type));
  const users = usersQuery.data ?? [];
  const navigate = useNavigate();
  const { userId: myId } = useAuth();

  const followMutation = useMutation({
    mutationFn: toggleProfileFollow,
    onMutate: ({ username, following }) => {
      queryClient.setQueryData<UserPublicProfile[]>(profileKeys.follows(userId, type), (previous = []) =>
        previous.map((user) => user.id === username ? {
          ...user,
          is_following: !following,
          followers_count: user.followers_count + (following ? -1 : 1),
        } : user),
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: profileKeys.follows(userId, type) }),
  });

  const handleFollowToggle = (targetUserId: string, currentlyFollowing: boolean) => {
    followMutation.mutate({ username: targetUserId, following: currentlyFollowing });
  };

  const handleUserClick = (username: string) => {
    onClose();
    navigate({ to: '/profile/$userId', params: { userId: username } });
  };

  const title = type === 'followers' ? 'Seguidores' : 'Seguindo';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-list-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="follow-list-title">{title}</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar lista"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {usersQuery.isPending ? (
            <Loader minHeight="200px" />
          ) : usersQuery.isError ? (
            <div className={styles.error}>Não foi possível carregar a lista.</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>Nenhum usuário encontrado.</div>
          ) : (
            <div className={styles.userList}>
              {users.map(u => (
                <div key={u.id} className={styles.userCard}>
                  <button
                    type="button"
                    className={styles.userInfo}
                    onClick={() => handleUserClick(u.username)}
                    aria-label={`Abrir perfil de ${u.username}`}
                  >
                    <div className={styles.userAvatar}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.username}>{u.username}</span>
                      <span className={styles.followCounts}>
                        {u.followers_count} seguidores • {u.following_count} seguindo
                      </span>
                    </div>
                  </button>
                  {myId && myId !== u.id && (
                    <button
                      className={`${styles.followButton} ${u.is_following ? styles.following : ''}`}
                      onClick={() => handleFollowToggle(u.id, u.is_following)}
                    >
                      {u.is_following ? 'Seguindo' : 'Seguir'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
