import { Link } from 'react-router-dom';
import { formatDuration } from '../utils/time';
import type { Video } from '../types';

interface VideoTileProps {
  video: Video;
  isLocked: boolean;
  highestScore: number | null;
  totalQuestions: number;
  onWatchClick?: () => void;
}

export function VideoTile({ video, isLocked, highestScore, totalQuestions, onWatchClick }: VideoTileProps) {
  return (
    <article className={`video-tile ${isLocked ? 'video-tile-locked' : ''}`} aria-label={`Video: ${video.title}`}>
      <div className="video-tile-thumbnail">
        <img src={video.thumbnail} alt={video.title} />
        <div className="video-tile-duration">{formatDuration(video.duration)}</div>
        {isLocked && (
          <div className="video-tile-lock-overlay">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="video-tile-content">
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        {highestScore !== null && (
          <div className="video-tile-score">
            Best Score: {highestScore}/{totalQuestions}
          </div>
        )}
        {isLocked ? (
          <button
            className="video-tile-watch-button video-tile-watch-button-locked"
            disabled
            aria-label={`${video.title} is locked`}
          >
            Locked
          </button>
        ) : (
          <Link
            to={`/player/${video.id}`}
            className="video-tile-watch-button"
            onClick={onWatchClick}
            aria-label={`Watch ${video.title}`}
          >
            Watch
          </Link>
        )}
      </div>
    </article>
  );
}


