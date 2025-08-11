import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
// --- THE FALLBACK FIX ---
// This path goes up one level from `pages` to `src`, then down to `components`.
import Header from '../components/Header';
import Modal from '../components/Modal';
import styles from '../styles/Dashboard.module.css';
import { Video, PlusSquare, Calendar, ScreenShare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // State for modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // State for Join Modal form
  const [roomName, setRoomName] = useState('');
  const [joinName, setJoinName] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && !joinName) {
      // Pre-fill the user's name in the join modal
      setJoinName(user.name);
    }
  }, [user, isLoading, router, joinName]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      router.push(`/${roomName.trim()}`);
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.card}>
          <div className={styles.actionGrid}>
            {/* New Meeting Button */}
            <button className={`${styles.actionButton} ${styles.newMeeting}`} onClick={() => router.push(`/${uuidv4()}`)}>
              <div className={styles.iconWrapper}>
                <Video className={styles.icon} />
              </div>
              <span className={styles.buttonText}>New Meeting</span>
            </button>

            {/* Join Button */}
            <button className={`${styles.actionButton} ${styles.join}`} onClick={() => setIsJoinModalOpen(true)}>
              <div className={styles.iconWrapper}>
                <PlusSquare className={styles.icon} />
              </div>
              <span className={styles.buttonText}>Join</span>
            </button>
            
            {/* Schedule Button */}
            <button className={`${styles.actionButton} ${styles.schedule}`} onClick={() => setIsScheduleModalOpen(true)}>
              <div className={styles.iconWrapper}>
                <Calendar className={styles.icon} />
              </div>
              <span className={styles.buttonText}>Schedule</span>
            </button>

            {/* Share Screen Button */}
            <button className={`${styles.actionButton} ${styles.shareScreen}`} onClick={() => setIsShareModalOpen(true)}>
              <div className={styles.iconWrapper}>
                <ScreenShare className={styles.icon} />
              </div>
              <span className={styles.buttonText}>Share Screen</span>
            </button>
          </div>
        </div>
      </main>

      {/* --- Modals --- */}
      <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join Meeting">
        <form onSubmit={handleJoinRoom} className={styles.joinModalForm}>
          <input
            type="text"
            className={styles.joinInput}
            placeholder="Meeting ID or personal link name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
          <input
            type="text"
            className={styles.joinInput}
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            required
          />
          <div className={styles.checkboxContainer}>
            <label className={styles.checkboxItem}>
              <input type="checkbox" />
              <span>Don't connect to audio</span>
            </label>
            <label className={styles.checkboxItem}>
              <input type="checkbox" />
              <span>Turn off my video</span>
            </label>
          </div>
          <div className={styles.joinActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setIsJoinModalOpen(false)}>Cancel</button>
            <button type="submit" className={styles.joinButton} disabled={!roomName.trim() || !joinName.trim()}>Join</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule Meeting">
        <p>This is a placeholder for the scheduling feature. Full implementation coming soon!</p>
        <div className={styles.joinActions}>
          <button type="button" className={styles.cancelButton} onClick={() => setIsScheduleModalOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Screen">
        <p>This is a placeholder for sharing your screen directly from the dashboard. This feature is typically used when you are already in a meeting.</p>
        <div className={styles.joinActions}>
          <button type="button" className={styles.cancelButton} onClick={() => setIsShareModalOpen(false)}>Close</button>
        </div>
      </Modal>
    </>
  );
}