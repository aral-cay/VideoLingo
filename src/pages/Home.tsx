import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { VideoTile } from '../components/VideoTile';
import { GamifiedHome } from './GamifiedHome';
import { isGamifiedVersion } from '../utils/userVersion';
import videosData from '../data/videos.json';
import type { Video } from '../types';
import { isVideoUnlocked, getVideoScore } from '../utils/userProgress';

export function Home() {
  const { participantId, username, condition, logout } = useAuth();
  
  // Show gamified version based on condition
  if (isGamifiedVersion(condition)) {
    return <GamifiedHome />;
  }
  
  // Show control version for Kabir and Luca
  const [videos] = useState<Video[]>(videosData as Video[]);
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [videoStates, setVideoStates] = useState<Map<string, { unlocked: boolean; score: number | null }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Load video states from Supabase
  useEffect(() => {
    if (!participantId) return;

    const loadVideoStates = async () => {
      setIsLoading(true);
      const allVideoIds = videos.map(v => v.id);
      const states = new Map<string, { unlocked: boolean; score: number | null }>();

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const unlocked = await isVideoUnlocked(participantId, video.id, i, allVideoIds);
        const score = await getVideoScore(participantId, video.id);
        states.set(video.id, { unlocked, score });
      }

      setVideoStates(states);
      setIsLoading(false);
    };

    loadVideoStates();
  }, [participantId, videos, refreshKey]);

  // Refresh when location changes or component mounts
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [location.pathname, location.key]);

  // Listen for video completion events
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('videoCompleted', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    
    return () => {
      window.removeEventListener('videoCompleted', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  if (!participantId || !username) {
    return null;
  }

  return (
    <div className="home-page">
      <header className="app-header">
        <h1 className="app-title">VideoLingo</h1>
        <div className="header-user-section">
          <span className="header-username">Welcome, {username}!</span>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="home-main">
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            fontSize: '18px',
            color: '#666'
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
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #4CAF50',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p>Loading your videos...</p>
            </div>
          </div>
        ) : (
          <div className="videos-grid">
            {videos.map((video, index) => {
              const state = videoStates.get(video.id) || { unlocked: false, score: null };
              const totalQuestions = video.quiz?.questions?.length || 0;
              
              return (
                <VideoTile
                  key={`${video.id}-${refreshKey}`}
                  video={video}
                  isLocked={!state.unlocked}
                  highestScore={state.score}
                  totalQuestions={totalQuestions}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
