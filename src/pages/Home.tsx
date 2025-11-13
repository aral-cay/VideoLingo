import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VideoTile } from '../components/VideoTile';
import videosData from '../data/videos.json';
import type { Video } from '../types';

export function Home() {
  const { user, logout } = useAuth();
  const [videos] = useState<Video[]>(videosData as Video[]);

  return (
    <div className="home-page">
      <header className="app-header">
        <h1 className="app-title">VideoLingo</h1>
        <div className="header-user-section">
          <span className="header-username">Welcome, {user}!</span>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="home-main">
        <div className="videos-grid">
          {videos.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </div>
      </main>
    </div>
  );
}

