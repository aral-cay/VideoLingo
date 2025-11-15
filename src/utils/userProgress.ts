/**
 * User Progress Management with Supabase
 * Tracks completed videos and quiz scores per participant
 */

import { supabase } from '../lib/supabase';

export interface UserProgress {
  completedVideos: string[]; // Array of video IDs that have been completed
  videoScores: Record<string, number>; // videoId -> highest score (e.g., 7 for 7/10)
}

/**
 * Get participant progress from Supabase
 */
export async function getUserProgress(participantId: string): Promise<UserProgress> {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('completed_videos, video_scores')
      .eq('participant_id', participantId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user progress:', error);
      return { completedVideos: [], videoScores: {} };
    }

    if (data) {
      return {
        completedVideos: (data.completed_videos as string[]) || [],
        videoScores: (data.video_scores as Record<string, number>) || {},
      };
    }

    // No progress found, return empty
    return { completedVideos: [], videoScores: {} };
  } catch (error) {
    console.error('Failed to get user progress:', error);
    return { completedVideos: [], videoScores: {} };
  }
}

/**
 * Save participant progress to Supabase
 */
export async function saveUserProgress(participantId: string, progress: UserProgress): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        participant_id: participantId,
        completed_videos: progress.completedVideos,
        video_scores: progress.videoScores,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'participant_id',
      });

    if (error) {
      console.error('Error saving user progress:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to save user progress:', error);
    throw error;
  }
}

/**
 * Check if a video is unlocked for a participant
 * First video (index 0) is always unlocked
 * Subsequent videos are unlocked when the previous video is completed
 */
export async function isVideoUnlocked(
  participantId: string,
  videoId: string,
  videoIndex: number,
  allVideoIds: string[]
): Promise<boolean> {
  // First video (index 0) is always unlocked
  if (videoIndex === 0) {
    return true;
  }

  const progress = await getUserProgress(participantId);

  // STRICT CHECK: Video is unlocked ONLY if the previous video is completed
  const completedVideos = Array.isArray(progress.completedVideos) ? progress.completedVideos : [];

  // If no videos completed, only first video is unlocked
  if (completedVideos.length === 0) {
    return false;
  }

  // Check if the previous video (at index - 1) is completed
  if (videoIndex > 0 && videoIndex < allVideoIds.length) {
    const previousVideoId = allVideoIds[videoIndex - 1];
    const isUnlocked = completedVideos.includes(previousVideoId);

    // Debug logging
    console.log(`[Unlock] Video ${videoId} (idx ${videoIndex}): prev=${previousVideoId}, completed=[${completedVideos.join(',')}], unlocked=${isUnlocked}`);

    return isUnlocked;
  }

  // Fallback: should not reach here, but be safe
  return false;
}

/**
 * Mark a video as completed and unlock the next one
 */
export async function markVideoCompleted(
  participantId: string,
  videoId: string,
  score: number,
  totalQuestions: number
): Promise<void> {
  const progress = await getUserProgress(participantId);

  // Add to completed videos if not already there
  if (!progress.completedVideos.includes(videoId)) {
    progress.completedVideos.push(videoId);
  }

  // Update highest score (store the number of correct answers)
  const currentHighScore = progress.videoScores[videoId] || 0;
  if (score > currentHighScore) {
    progress.videoScores[videoId] = score;
  }

  await saveUserProgress(participantId, progress);
}

/**
 * Get the highest score for a video
 */
export async function getVideoScore(participantId: string, videoId: string): Promise<number | null> {
  const progress = await getUserProgress(participantId);
  return progress.videoScores[videoId] || null;
}

/**
 * Check if a video is completed
 */
export async function isVideoCompleted(participantId: string, videoId: string): Promise<boolean> {
  const progress = await getUserProgress(participantId);
  return progress.completedVideos.includes(videoId);
}
