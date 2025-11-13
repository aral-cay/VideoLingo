import { Link } from 'react-router-dom';
import { formatDuration } from '../utils/time';
import type { Video } from '../types';

interface VideoTileProps {
  video: Video;
  onWatchClick?: () => void;
}

export function VideoTile({ video, onWatchClick }: VideoTileProps) {
  return (
    <article className="video-tile" aria-label={`Video: ${video.title}`}>
      <div className="video-tile-thumbnail">
        <img src={video.thumbnail} alt={video.title} />
        <div className="video-tile-duration">{formatDuration(video.duration)}</div>
      </div>
      <div className="video-tile-content">
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <Link
          to={`/player/${video.id}`}
          className="video-tile-watch-button"
          onClick={onWatchClick}
          aria-label={`Watch ${video.title}`}
        >
          Watch
        </Link>
      </div>
    </article>
  );
}


