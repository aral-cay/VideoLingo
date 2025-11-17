/**
 * Video Loader Utility
 * Dynamically loads the correct video batch based on participant's assigned batch
 */

import { Video } from '../types';
import batch1 from '../data/videos_batch1.json';
import batch2 from '../data/videos_batch2.json';

/**
 * Load videos based on the video batch filename
 * @param videoBatch - The batch filename (e.g., 'videos_batch1.json' or 'videos_batch2.json')
 * @returns Array of video objects
 */
export function loadVideoBatch(videoBatch: string): Video[] {
  switch (videoBatch) {
    case 'videos_batch1.json':
      return batch1 as Video[];
    case 'videos_batch2.json':
      return batch2 as Video[];
    default:
      return batch1 as Video[];
  }
}

/**
 * Get a specific video by ID from a batch
 * @param videoBatch - The batch filename
 * @param videoId - The video ID to find
 * @returns The video object or undefined if not found
 */
export function getVideoById(videoBatch: string, videoId: string): Video | undefined {
  const videos = loadVideoBatch(videoBatch);
  return videos.find((v) => v.id === videoId);
}

/**
 * Get the total number of videos in a batch
 * @param videoBatch - The batch filename
 * @returns The number of videos in the batch
 */
export function getVideoBatchCount(videoBatch: string): number {
  const videos = loadVideoBatch(videoBatch);
  return videos.length;
}

