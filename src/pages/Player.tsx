import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QuizModal } from '../components/QuizModal';
import { GamifiedQuiz } from '../components/GamifiedQuiz';
import videosData from '../data/videos.json';
import type { Video } from '../types';
import lexosaLogo from '../assets/lexosa-logo.png';
import { isVideoUnlocked, markVideoCompleted } from '../utils/userProgress';
import { getVideoState, saveVideoState } from '../utils/videoState';
import { saveQuizResult } from '../utils/quizResults';
import { isGamifiedVersion } from '../utils/userVersion';
import { addXP, saveVideoStars, calculateStars, calculateXP, updateStreak, getGamificationData, updateHearts } from '../utils/gamification';

export function Player() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { participantId, username, condition, logout } = useAuth();
  const [videos] = useState<Video[]>(videosData as Video[]);
  const video = videos.find((v) => v.id === id);
  const videoIndex = videos.findIndex((v) => v.id === id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [currentHearts, setCurrentHearts] = useState<number>(20);

  useEffect(() => {
    if (!video || !participantId) {
      navigate('/');
      return;
    }

    // Check if video is unlocked
    const checkUnlock = async () => {
      const allVideoIds = videos.map(v => v.id);
      const unlocked = await isVideoUnlocked(participantId, video.id, videoIndex, allVideoIds);
      if (!unlocked) {
        navigate('/');
        return;
      }

      // Load video state from Supabase
      const savedState = await getVideoState(participantId, video.id);
      if (savedState) {
        setCaptionsEnabled(savedState.lastCaptionState || false);
        if (savedState.lastPositionSec && videoRef.current && !videoRef.current.src.includes('youtube.com')) {
          videoRef.current.currentTime = savedState.lastPositionSec;
        }
      }
    };

    checkUnlock();

    return () => {
      // Save video state to Supabase
      const saveState = async () => {
        if (videoRef.current && video && participantId && !videoRef.current.src.includes('youtube.com')) {
          const completionPercent =
            videoRef.current.duration > 0
              ? (videoRef.current.currentTime / videoRef.current.duration) * 100
              : 0;
          await saveVideoState(participantId, video.id, {
            completionPercent,
            lastPositionSec: videoRef.current.currentTime,
            lastCaptionState: captionsEnabled,
          });
        }
      };
      saveState();
    };
  }, [video, navigate, captionsEnabled, participantId, videoIndex, videos]);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setVideoPaused(false);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setVideoPaused(true);
    }
  };

  const handleVideoEnd = () => {
    // Video ended
  };

  const handleTimeUpdate = () => {
    // Time update handler if needed
  };

  const handleCaptionsToggle = async () => {
    const newState = !captionsEnabled;
    setCaptionsEnabled(newState);
    // Save state to Supabase
    if (video && participantId && videoRef.current) {
      const completionPercent =
        videoRef.current.duration > 0
          ? (videoRef.current.currentTime / videoRef.current.duration) * 100
          : 0;
      await saveVideoState(participantId, video.id, {
        completionPercent,
        lastPositionSec: videoRef.current.currentTime,
        lastCaptionState: newState,
      });
    }
  };

  const handleStartQuiz = () => {
    setQuizVisible(true);
  };

  const handleQuizVisibilityChange = (visible: boolean) => {
    setQuizVisible(visible);
  };

  const handleQuizComplete = async (score: {
    correct: number;
    total: number;
    accuracy: number;
  }) => {
    setQuizCompleted(true);
    setQuizStarted(true);

    // Save quiz results and mark video as completed
    if (video && participantId && username) {
      const quizResults = {
        videoId: video.id,
        completedAt: Date.now(),
        correctCount: score.correct,
        incorrectCount: score.total - score.correct,
        totalQuestions: score.total,
        scoreAccuracy: score.accuracy,
      };

      // Save to Supabase
      await saveQuizResult(participantId, quizResults);

      // Mark video as completed and unlock next video
      await markVideoCompleted(participantId, video.id, score.correct, score.total);
      
      // Handle gamification for gamified users
      if (isGamifiedVersion(condition)) {
        // Calculate and save stars
        const stars = calculateStars(score.correct, score.total);
        await saveVideoStars(participantId, video.id, stars);
        
        // Calculate and award XP: +5 per correct, +10 for 8/10+, +20 for 10/10
        const xpReward = calculateXP(score.correct, score.total);
        await addXP(participantId, xpReward);
        
        // Hearts are already deducted in real-time during quiz, no need to deduct again
        
        // Update streak
        await updateStreak(participantId);
      }
      
      // Dispatch custom event to notify Home page to refresh
      window.dispatchEvent(new Event('videoCompleted'));
    }
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  if (!video) {
    return null;
  }

  // Format views number
  const formatViews = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Mock views count
  const mockViews = Math.floor(Math.random() * 50000000) + 1000000;
  const mockDate = '3 days ago';

  // Check if video is YouTube embed
  const isYouTubeEmbed = video?.src.includes('youtube.com/embed') || video?.src.includes('youtube.com/watch');
  
  // Extract YouTube video ID and create embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed')) {
      return url;
    }
    if (url.includes('youtube.com/watch')) {
      const videoId = url.match(/[?&]v=([^&]+)/)?.[1];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return url;
  };

  return (
    <div className="youtube-player-page">
      {/* YouTube Header */}
      <header className="youtube-header">
        <div className="youtube-header-left">
          <button className="youtube-menu-icon" aria-label="Menu">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
            </svg>
          </button>
          <Link to="/" className="youtube-logo">
            <svg viewBox="0 0 90 20" width="90" height="20">
              <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5701 5.35042 27.9727 3.12324Z" fill="#FF0000"/>
              <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
            </svg>
            <span className="youtube-logo-text">YouTube</span>
          </Link>
        </div>
        <div className="youtube-header-center">
          <div className="youtube-search-container">
            <input type="text" className="youtube-search-input" placeholder="Search" disabled />
            <button className="youtube-search-button" aria-label="Search" disabled>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
              </svg>
            </button>
            <button className="youtube-voice-search-button" aria-label="Voice search" disabled>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="youtube-header-right">
          <button className="youtube-create-button" aria-label="Create" disabled>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2zm3-7H3v12h14v-12zm0-2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="currentColor"/>
            </svg>
            <span>Create</span>
          </button>
          <button 
            className="youtube-open-button" 
            onClick={handleStartQuiz}
            aria-label="Open quiz"
          >
            <span>Open</span>
          </button>
          <button className="youtube-header-icon" aria-label="Notifications" disabled>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
            </svg>
          </button>
          <div className="youtube-profile-icon" aria-label="Profile" title={username || 'User'}>
            <span>{username ? username.charAt(0).toUpperCase() : 'A'}</span>
          </div>
          <button 
            className="youtube-logout-button" 
            onClick={() => { logout(); navigate('/login'); }}
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="youtube-content">
        {/* Left Side - Video Player */}
        <div className="youtube-main-content">
          <div className="youtube-video-container">
            {isYouTubeEmbed ? (
              <iframe
                src={getYouTubeEmbedUrl(video.src)}
                className="youtube-video-player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={video.src}
                controls
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleVideoEnd}
                onTimeUpdate={handleTimeUpdate}
                className="youtube-video-player"
                aria-label={`Video: ${video.title}`}
              >
                {captionsEnabled &&
                  video.captions.map((caption, idx) => (
                    <track
                      key={idx}
                      kind="captions"
                      srcLang={caption.lang}
                      src={caption.url || ''}
                      label={caption.lang}
                    />
                  ))}
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Video Info */}
          <div className="youtube-video-info">
            <h1 className="youtube-video-title">{video.title}</h1>
            <div className="youtube-video-meta">
              <div className="youtube-video-stats">
                <span className="youtube-views">{formatViews(mockViews)} views</span>
                <span className="youtube-date">{mockDate}</span>
              </div>
              <div className="youtube-engagement">
                <button className="youtube-like-button" disabled>
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" fill="currentColor"/>
                  </svg>
                  <span>{formatViews(Math.floor(mockViews * 0.025))}</span>
                </button>
                <button className="youtube-dislike-button" disabled>
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"/>
                  </svg>
                </button>
                <button className="youtube-share-button" disabled>
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
                  </svg>
                  <span>Share</span>
                </button>
                <button className="youtube-save-button" disabled>
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill="currentColor"/>
                  </svg>
                  <span>Save</span>
                </button>
                <button className="youtube-more-button" disabled>
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Channel Info */}
          <div className="youtube-channel-info">
            <div className="youtube-channel-header">
              <div className="youtube-channel-avatar">M</div>
              <div className="youtube-channel-details">
                <div className="youtube-channel-name">
                  Italian Learning Channel
                  <svg className="youtube-verified" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#065FD4"/>
                  </svg>
                </div>
                <div className="youtube-channel-subs">450K subscribers</div>
              </div>
              <button className="youtube-subscribe-button" disabled>Subscribe</button>
            </div>
            <div className="youtube-video-description">
              <p>{video.description}</p>
              <button className="youtube-show-more" disabled>Show more</button>
            </div>
          </div>

        </div>

        {/* Right Sidebar - Related Videos */}
        <aside className="youtube-sidebar">
          {/* Ad Placeholder */}
          <div className="youtube-sidebar-ad">
            <div className="youtube-ad-content">
              <img src={lexosaLogo} alt="Lexosa" className="youtube-ad-icon-img" />
              <div className="youtube-ad-text">
                <div className="youtube-ad-title">Lexosa</div>
                <div className="youtube-ad-site">lexosa.com</div>
                <div className="youtube-ad-label">Sponsored</div>
              </div>
              <button className="youtube-ad-download" disabled>Download</button>
            </div>
          </div>

          {/* Related Videos */}
          <div className="youtube-related-videos">
            <div className="youtube-related-tabs">
              <button className="youtube-tab active" disabled>All</button>
              <button className="youtube-tab" disabled>Related</button>
            </div>
            {videos.slice(0, 5).map((relatedVideo) => (
              <div key={relatedVideo.id} className="youtube-related-video-item" style={{ pointerEvents: 'none', opacity: 0.7 }}>
                <div className="youtube-related-thumbnail">
                  <img src={relatedVideo.thumbnail} alt={relatedVideo.title} />
                  <span className="youtube-related-duration">{Math.floor(relatedVideo.duration / 60)}:{(relatedVideo.duration % 60).toString().padStart(2, '0')}</span>
                </div>
                <div className="youtube-related-info">
                  <div className="youtube-related-title">{relatedVideo.title}</div>
                  <div className="youtube-related-channel">Italian Learning Channel</div>
                  <div className="youtube-related-meta">
                    {formatViews(Math.floor(Math.random() * 10000000) + 100000)} views • {mockDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Quiz Sidebar */}
      {quizVisible && (
        <aside className="youtube-quiz-sidebar">
          {isGamifiedVersion(condition) ? (
            <GamifiedQuiz
              quiz={video.quiz}
              onClose={handleReturnHome}
              onComplete={handleQuizComplete}
              isVisible={quizVisible}
              onVisibilityChange={handleQuizVisibilityChange}
              participantId={participantId || ''}
              onHeartsUpdate={setCurrentHearts}
            />
          ) : (
            <QuizModal
              quiz={video.quiz}
              onClose={handleReturnHome}
              onComplete={handleQuizComplete}
              isVisible={quizVisible}
              onVisibilityChange={handleQuizVisibilityChange}
            />
          )}
        </aside>
      )}
    </div>
  );
}

