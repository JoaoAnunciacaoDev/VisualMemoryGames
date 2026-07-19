import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import styles from './FollowListModal.module.css';
import { Loader } from '@/components/Shared';

interface UserPublicProfile {
  id: string;
  username: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

const FollowListModal: React.FC<FollowListModalProps> = ({ userId, type, onClose }) => {
  const [users, setUsers] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { userId: myId } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get(`/social/users/${userId}/${type}`);
        setUsers(res.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Não foi possível carregar a lista.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [userId, type]);

  const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
    const url = `/social/users/${targetUserId}/follow`;
    
    try {
      if (currentlyFollowing) {
        await api.delete(url);
      } else {
        await api.post(url);
      }
      
      setUsers(prev => prev.map(u => {
        if (u.id === targetUserId) {
          return {
            ...u,
            is_following: !currentlyFollowing,
            followers_count: currentlyFollowing ? u.followers_count - 1 : u.followers_count + 1
          };
        }
        return u;
      }));
    } catch (err) {
      console.error("Erro ao alterar status de seguir", err);
    }
  };

  const handleUserClick = (username: string) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  const title = type === 'followers' ? 'Seguidores' : 'Seguindo';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          {loading ? (
            <Loader minHeight="200px" />
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>Nenhum usuário encontrado.</div>
          ) : (
            <div className={styles.userList}>
              {users.map(u => (
                <div key={u.id} className={styles.userCard}>
                  <div className={styles.userInfo} onClick={() => handleUserClick(u.username)}>
                    <div className={styles.userAvatar}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.username}>{u.username}</span>
                      <span className={styles.followCounts}>
                        {u.followers_count} seguidores • {u.following_count} seguindo
                      </span>
                    </div>
                  </div>
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
