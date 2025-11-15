import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getCharacterImage } from '../utils/characterAvatar';
import './GamifiedHome.css';

interface GamificationData {
  xp: number;
  hearts: number;
  streakDays: number;
}

interface LeaderboardEntry {
  username: string;
  xp: number;
  participantId: string;
}

export function GamifiedHome() {
  const { participantId, username, condition, logout } = useAuth();
  const navigate = useNavigate();
  const [gamification, setGamification] = useState<GamificationData>({
    xp: 0,
    hearts: 5,
    streakDays: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!participantId) return;

    const loadGamification = async () => {
      setIsLoading(true);
      try {
        // Check and reset hearts for new day (11:59 PM EST)
        // Also check and update streak if needed
        const { checkAndResetDailyHearts, updateStreak } = await import('../utils/gamification');
        await checkAndResetDailyHearts(participantId);
        await updateStreak(participantId);
        
        // Then load updated gamification data
        const { data, error } = await supabase
          .from('user_gamification')
          .select('xp, hearts, streak_days')
          .eq('participant_id', participantId)
          .single();

        if (data && !error) {
          // Ensure streak is at least 1 if user is logged in
          const streakDays = data.streak_days || 0;
          
          // If streak was 0, update it in the database immediately
          if (streakDays === 0) {
            const { updateGamificationData } = await import('../utils/gamification');
            await updateGamificationData(participantId, { streakDays: 1 });
            // Reload data after update
            const { data: updatedData } = await supabase
              .from('user_gamification')
              .select('xp, hearts, streak_days')
              .eq('participant_id', participantId)
              .single();
            
            if (updatedData) {
              setGamification({
                xp: updatedData.xp || 0,
                hearts: updatedData.hearts || 20,
                streakDays: updatedData.streak_days || 1,
              });
            }
          } else {
            setGamification({
              xp: data.xp || 0,
              hearts: data.hearts || 20,
              streakDays: streakDays,
            });
          }
        }
      } catch (error) {
        console.error('Error loading gamification data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGamification();
  }, [participantId]);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        // Get all gamified users (Aral, Test, Nikhil)
        const gamifiedUsernames = ['Aral', 'Test', 'Nikhil'];
        
        // Fetch participants and their gamification data
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('id, username')
          .in('username', gamifiedUsernames);

        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          return;
        }

        if (!participantsData || participantsData.length === 0) {
          return;
        }

        const participantIds = participantsData.map(p => p.id);

        // Fetch gamification data for these participants
        const { data: gamData, error: gamError } = await supabase
          .from('user_gamification')
          .select('participant_id, xp')
          .in('participant_id', participantIds);

        if (gamError) {
          console.error('Error fetching gamification data:', gamError);
          return;
        }

        // Combine participant data with gamification data
        const leaderboardEntries: LeaderboardEntry[] = participantsData
          .map(participant => {
            const gamDataForParticipant = gamData?.find(g => g.participant_id === participant.id);
            return {
              username: participant.username,
              xp: gamDataForParticipant?.xp || 0,
              participantId: participant.id,
            };
          })
          .sort((a, b) => b.xp - a.xp); // Sort by XP descending

        setLeaderboard(leaderboardEntries);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      }
    };

    loadLeaderboard();
    
    // Refresh leaderboard when XP updates (listen for video completion events)
    const handleRefresh = () => {
      loadLeaderboard();
    };
    
    window.addEventListener('videoCompleted', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    
    return () => {
      window.removeEventListener('videoCompleted', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [participantId]); // Reload when user changes or when XP updates

  const handlePlay = () => {
    navigate('/journey');
  };

  if (!participantId || !username) {
    return null;
  }

  return (
    <div className="gamified-home">
      {/* Top Bar */}
      <header className="gamified-header">
        <div className="gamified-header-left">
          <h1 className="app-title">VideoLingo</h1>
          <span className="header-username">Welcome, {username}!</span>
        </div>
        <div className="gamified-header-right">
          <div className="gamified-xp">
            <span className="xp-label">XP</span>
            <span className="xp-value">{gamification.xp}</span>
          </div>
          <div className="gamified-hearts">
            <span className="heart-icon">♥</span>
            <span className="heart-value">{gamification.hearts}</span>
          </div>
          <button className="gamified-logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="gamified-main">
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            fontSize: '18px',
            color: '#e0e7ff',
            gridColumn: '1 / -1'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(255, 255, 255, 0.1)',
                borderTop: '4px solid #7c3aed',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p>Loading your journey...</p>
            </div>
          </div>
        ) : (
          <>
        {/* Left Sidebar - Leaderboard */}
        <aside className="gamified-sidebar-left">
          <div className="leaderboard-section">
            <h3 className="leaderboard-title">🏆 Leaderboard</h3>
            <div className="leaderboard-content">
              {leaderboard.length === 0 ? (
                <div className="leaderboard-empty">No players yet</div>
              ) : (
                leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.participantId === participantId;
                  const isTopThree = index < 3;
                  return (
                    <div
                      key={entry.participantId}
                      className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''} ${isTopThree ? 'top-three' : ''}`}
                    >
                      <span className={`rank ${isTopThree ? `rank-${index + 1}` : ''}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                      <span className="name">{entry.username}{isCurrentUser ? ' (You)' : ''}</span>
                      <span className="score">{entry.xp.toLocaleString()} XP</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Center - Character */}
        <div className="gamified-center">
          <div className="character-container">
            <div className="character-avatar">
              <img 
                src={getCharacterImage(username, 'standing')} 
                alt={`${username}'s character`}
                className="character-image"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Streak */}
        <aside className="gamified-sidebar-right">
          <div className="streak-section">
            <div className="streak-display">
              <div className="streak-fire">🔥</div>
              <div className="streak-content">
                <div className="streak-label">Streak</div>
                <div className="streak-days-value">{gamification.streakDays}</div>
                <div className="streak-days-text">{gamification.streakDays === 1 ? 'day' : 'days'}</div>
              </div>
            </div>
          </div>
        </aside>
        </>
        )}
      </main>

      {/* Bottom - Play Button */}
      <footer className="gamified-footer">
        <button className="gamified-play-button" onClick={handlePlay}>
          Play
        </button>
      </footer>
    </div>
  );
}

