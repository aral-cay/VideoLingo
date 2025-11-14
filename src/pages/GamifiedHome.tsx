import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './GamifiedHome.css';

interface GamificationData {
  xp: number;
  hearts: number;
  streakDays: number;
}

interface LeaderboardEntry {
  username: string;
  xp: number;
  userId: string;
}

export function GamifiedHome() {
  const { userId, username, logout } = useAuth();
  const navigate = useNavigate();
  const [gamification, setGamification] = useState<GamificationData>({
    xp: 0,
    hearts: 5,
    streakDays: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!userId) return;

    const loadGamification = async () => {
      try {
        // Check and reset hearts for new day (11:59 PM EST)
        // Also check and update streak if needed
        const { checkAndResetDailyHearts, updateStreak } = await import('../utils/gamification');
        await checkAndResetDailyHearts(userId);
        await updateStreak(userId);
        
        // Then load updated gamification data
        const { data, error } = await supabase
          .from('user_gamification')
          .select('xp, hearts, streak_days')
          .eq('user_id', userId)
          .single();

        if (data && !error) {
          // Ensure streak is at least 1 if user is logged in
          const streakDays = data.streak_days || 0;
          
          // If streak was 0, update it in the database immediately
          if (streakDays === 0) {
            const { updateGamificationData } = await import('../utils/gamification');
            await updateGamificationData(userId, { streakDays: 1 });
            // Reload data after update
            const { data: updatedData } = await supabase
              .from('user_gamification')
              .select('xp, hearts, streak_days')
              .eq('user_id', userId)
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
      }
    };

    loadGamification();
  }, [userId]);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        // Get all gamified users (Aral, Test, Nikhil)
        const gamifiedUsernames = ['Aral', 'Test', 'Nikhil'];
        
        // Fetch users and their gamification data
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username')
          .in('username', gamifiedUsernames);

        if (usersError) {
          console.error('Error fetching users:', usersError);
          return;
        }

        if (!usersData || usersData.length === 0) {
          return;
        }

        const userIds = usersData.map(u => u.id);

        // Fetch gamification data for these users
        const { data: gamData, error: gamError } = await supabase
          .from('user_gamification')
          .select('user_id, xp')
          .in('user_id', userIds);

        if (gamError) {
          console.error('Error fetching gamification data:', gamError);
          return;
        }

        // Combine user data with gamification data
        const leaderboardEntries: LeaderboardEntry[] = usersData
          .map(user => {
            const gamDataForUser = gamData?.find(g => g.user_id === user.id);
            return {
              username: user.username,
              xp: gamDataForUser?.xp || 0,
              userId: user.id,
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
  }, [userId]); // Reload when user changes or when XP updates

  const handlePlay = () => {
    navigate('/journey');
  };

  if (!userId || !username) {
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
            <span className="heart-icon">♡</span>
            <span className="heart-value">{gamification.hearts}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="gamified-main">
        {/* Left Sidebar - Leaderboard */}
        <aside className="gamified-sidebar-left">
          <div className="leaderboard-section">
            <h3 className="leaderboard-title">🏆 Leaderboard</h3>
            <div className="leaderboard-content">
              {leaderboard.length === 0 ? (
                <div className="leaderboard-empty">No players yet</div>
              ) : (
                leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === userId;
                  const isTopThree = index < 3;
                  return (
                    <div
                      key={entry.userId}
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
              {/* Helmet/Head */}
              <div className="character-helmet">
                <div className="helmet-visor"></div>
                <div className="helmet-detail"></div>
              </div>
              {/* Body/Torso */}
              <div className="character-body">
                <div className="body-armor"></div>
                <div className="body-core"></div>
              </div>
              {/* Accessories */}
              <div className="character-accessories">
                <div className="accessory-left"></div>
                <div className="accessory-right"></div>
              </div>
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
      </main>

      {/* Bottom - Play Button */}
      <footer className="gamified-footer">
        <button className="gamified-play-button" onClick={handlePlay}>
          Play
        </button>
        <button className="gamified-logout-button" onClick={logout}>
          Logout
        </button>
      </footer>
    </div>
  );
}

