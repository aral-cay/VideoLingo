import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isGamifiedUser } from '../utils/userVersion';
import videosData from '../data/videos.json';
import type { Video } from '../types';
import { isVideoUnlocked, getVideoScore } from '../utils/userProgress';
import { supabase } from '../lib/supabase';
import './Journey.css';

interface GamificationData {
  xp: number;
  hearts: number;
}

interface OtherUserPosition {
  userId: string;
  username: string;
  position: number; // Index of the last completed video (or first unlocked if none completed)
  color: string;
}

export function Journey() {
  const { userId, username, logout } = useAuth();
  const navigate = useNavigate();
  const [videos] = useState<Video[]>(videosData as Video[]);
  const [videoStates, setVideoStates] = useState<Map<string, { unlocked: boolean; score: number | null; stars: number; totalQuestions: number }>>(new Map());
  const [gamification, setGamification] = useState<GamificationData>({ xp: 0, hearts: 20 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [otherUsers, setOtherUsers] = useState<OtherUserPosition[]>([]);
  
  // Colors for different users
  const userColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94'];

  useEffect(() => {
    if (!userId || !username) {
      navigate('/');
      return;
    }

    // Only gamified users can access journey page
    if (!isGamifiedUser(username)) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      // Load gamification data
      try {
        const { data: gamData } = await supabase
          .from('user_gamification')
          .select('xp, hearts')
          .eq('user_id', userId)
          .single();

        if (gamData) {
          setGamification({
            xp: gamData.xp || 0,
            hearts: gamData.hearts || 5,
          });
        }
      } catch (error) {
        console.error('Error loading gamification:', error);
      }

      // Load video states
      const allVideoIds = videos.map(v => v.id);
      const states = new Map<string, { unlocked: boolean; score: number | null; stars: number; totalQuestions: number }>();

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const unlocked = await isVideoUnlocked(userId, video.id, i, allVideoIds);
        const score = await getVideoScore(userId, video.id);
        const totalQuestions = video.quiz?.questions?.length || 10;
        
        // Get stars for this video
        let stars = 0;
        try {
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('video_stars')
            .eq('user_id', userId)
            .single();
          
          if (progressData?.video_stars && typeof progressData.video_stars === 'object') {
            stars = (progressData.video_stars as Record<string, number>)[video.id] || 0;
          }
        } catch (error) {
          console.error('Error loading stars:', error);
        }

        states.set(video.id, { unlocked, score, stars, totalQuestions });
      }

      setVideoStates(states);
    };

    const loadOtherUsers = async () => {
      try {
        // Get all gamified users except current user
        const gamifiedUsernames = ['Aral', 'Test', 'Nikhil'];
        const otherUsernames = gamifiedUsernames.filter(u => u !== username);
        
        if (otherUsernames.length === 0) {
          setOtherUsers([]);
          return;
        }

        // Fetch other users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username')
          .in('username', otherUsernames);

        if (usersError || !usersData) {
          console.error('Error fetching other users:', usersError);
          return;
        }

        const allVideoIds = videos.map(v => v.id);
        const otherUserPositions: OtherUserPosition[] = [];

        for (let i = 0; i < usersData.length; i++) {
          const user = usersData[i];
          
          // Get user's progress
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('completed_videos')
            .eq('user_id', user.id)
            .single();

          const completedVideos = (progressData?.completed_videos as string[]) || [];
          
          // Find the next video they're working on (last completed + 1, or first video if none completed)
          let position = 0;
          if (completedVideos.length > 0) {
            // Find the highest index of completed videos, then add 1 for next video
            let lastCompletedIndex = -1;
            for (let j = videos.length - 1; j >= 0; j--) {
              if (completedVideos.includes(videos[j].id)) {
                lastCompletedIndex = j;
                break;
              }
            }
            // Position is the next video after the last completed one
            position = Math.min(lastCompletedIndex + 1, videos.length - 1);
          } else {
            // No completed videos, show at first video (position 0)
            position = 0;
          }

          otherUserPositions.push({
            userId: user.id,
            username: user.username,
            position: position,
            color: userColors[i % userColors.length],
          });
        }

        setOtherUsers(otherUserPositions);
      } catch (error) {
        console.error('Error loading other users positions:', error);
      }
    };

    loadData();
    loadOtherUsers();
  }, [userId, username, videos, refreshKey, navigate]);

  useEffect(() => {
    const handleRefresh = async () => {
      setRefreshKey(prev => prev + 1);
      // Refresh gamification data (hearts, XP)
      if (userId) {
        try {
          const { data: gamData } = await supabase
            .from('user_gamification')
            .select('xp, hearts')
            .eq('user_id', userId)
            .single();

          if (gamData) {
            setGamification({
              xp: gamData.xp || 0,
              hearts: gamData.hearts || 20,
            });
          }
        } catch (error) {
          console.error('Error refreshing gamification data:', error);
        }
      }
    };
    
    window.addEventListener('videoCompleted', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    
    return () => {
      window.removeEventListener('videoCompleted', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [userId]);

  const handleHome = () => {
    navigate('/');
  };

  const handleVideoClick = (video: Video, unlocked: boolean) => {
    if (unlocked) {
      navigate(`/player/${video.id}`);
    }
  };

  if (!userId || !username) {
    return null;
  }

  return (
    <div className="journey-page">
      {/* Header */}
      <header className="journey-header">
        <div className="journey-header-left">
          <span className="journey-language">VideoLingo</span>
          <span className="journey-welcome">Welcome back {username}!</span>
        </div>
        <div className="journey-header-right">
          <div className="journey-xp">
            <span className="xp-label">XP</span>
            <span className="xp-value">{gamification.xp}</span>
          </div>
          <div className="journey-hearts">
            <span className="heart-icon">♡</span>
            <span className="heart-value">{gamification.hearts}</span>
          </div>
        </div>
      </header>

      {/* Home Button */}
      <div className="journey-home-button-container">
        <button className="journey-home-button" onClick={handleHome}>
          Home
        </button>
      </div>

      {/* Roadmap */}
      <main className="journey-main">
        <div className="journey-roadmap">
          <h2 className="journey-title">Your Learning Journey</h2>
          
          <div className="themes-container">
            {videos.map((video, index) => {
              const state = videoStates.get(video.id) || { unlocked: false, score: null, stars: 0, totalQuestions: 10 };
              const isFirstInTheme = index === 0 || (index > 0 && videos[index - 1].id !== video.id);
              const totalQuestions = state.totalQuestions || video.quiz?.questions?.length || 10;
              
              // Check if any other users are at this position
              const usersAtThisPosition = otherUsers.filter(u => u.position === index);
              
              return (
                <div key={video.id} className="video-node-container">
                  {/* Connection line */}
                  {index > 0 && (
                    <div className={`connection-line ${state.unlocked ? 'unlocked' : 'locked'}`}></div>
                  )}
                  
                  {/* Video Node */}
                  <div
                    className={`video-node ${state.unlocked ? 'unlocked' : 'locked'} ${state.stars > 0 ? 'completed' : ''}`}
                    onClick={() => handleVideoClick(video, state.unlocked)}
                  >
                    {/* Other users at this position */}
                    {usersAtThisPosition.length > 0 && (
                      <div className="other-users-at-node">
                        {usersAtThisPosition.map((otherUser, userIdx) => (
                          <div
                            key={otherUser.userId}
                            className="other-user-indicator"
                            style={{
                              '--user-color': otherUser.color,
                              left: `${50 + (userIdx - (usersAtThisPosition.length - 1) / 2) * 40}%`,
                            } as React.CSSProperties}
                            title={otherUser.username}
                          >
                            <div className="other-user-avatar" style={{ backgroundColor: otherUser.color }}>
                              {otherUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="other-user-name">{otherUser.username}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {state.unlocked ? (
                      <>
                        <div className="video-node-content">
                          {state.stars > 0 ? (
                            <div className="stars-display">
                              {[...Array(3)].map((_, i) => (
                                <span key={i} className={`star ${i < state.stars ? 'filled' : ''}`}>☆</span>
                              ))}
                            </div>
                          ) : (
                            <div className="video-number">{index + 1}</div>
                          )}
                        </div>
                        {isFirstInTheme && (
                          <div className="theme-label">
                            Theme: {video.title.split(' ').slice(0, 2).join(' ')}
                          </div>
                        )}
                        {state.score !== null && (
                          <div className="video-node-score">
                            Best: {state.score}/{totalQuestions}
                          </div>
                        )}
                        {state.stars === 3 && (
                          <div className="complete-badge">Complete</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="video-node-content locked-content">
                          <div className="lock-icon">🔒</div>
                        </div>
                        {isFirstInTheme && (
                          <div className="theme-label locked-theme">
                            Theme: ???
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

