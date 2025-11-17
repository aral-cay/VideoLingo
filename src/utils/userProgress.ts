/**
 * User Progress Management with Supabase
 * Tracks completed videos and quiz scores per participant per condition
 * This allows separate progress tracking when participants switch conditions
 */

import { supabase } from '../lib/supabase';
import type { Condition } from './studyCondition';

export interface UserProgress {
  completedVideos: string[]; // Array of video IDs that have been completed
  videoScores: Record<string, number>; // videoId -> highest score (e.g., 7 for 7/10)
}

/**
 * Get participant progress from Supabase for their current condition
 */
export async function getUserProgress(participantId: string, condition: Condition): Promise<UserProgress> {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('completed_videos, video_scores')
      .eq('participant_id', participantId)
      .eq('condition', condition)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return { completedVideos: [], videoScores: {} };
    }

    if (data) {
      return {
        completedVideos: (data.completed_videos as string[]) || [],
        videoScores: (data.video_scores as Record<string, number>) || {},
      };
    }

    // No progress found for this condition, return empty
    return { completedVideos: [], videoScores: {} };
  } catch (error) {
    return { completedVideos: [], videoScores: {} };
  }
}

/**
 * Save participant progress to Supabase for their current condition
 * Creates a new row if participant is in a new condition, updates existing row otherwise
 */
export async function saveUserProgress(participantId: string, condition: Condition, progress: UserProgress): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        participant_id: participantId,
        condition: condition,
        completed_videos: progress.completedVideos,
        video_scores: progress.videoScores,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'participant_id,condition',
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Check if a video is unlocked for a participant in their current condition
 * First video (index 0) is always unlocked
 * Subsequent videos are unlocked when the previous video is completed
 */
export async function isVideoUnlocked(
  participantId: string,
  condition: Condition,
  _videoId: string,
  videoIndex: number,
  allVideoIds: string[]
): Promise<boolean> {
  // First video (index 0) is always unlocked
  if (videoIndex === 0) {
    return true;
  }

  const progress = await getUserProgress(participantId, condition);

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

    return isUnlocked;
  }

  // Fallback: should not reach here, but be safe
  return false;
}

/**
 * Mark a video as completed and unlock the next one for the current condition
 */
export async function markVideoCompleted(
  participantId: string,
  condition: Condition,
  videoId: string,
  score: number,
  _totalQuestions: number // Prefix with _ to indicate intentionally unused
): Promise<void> {
  const progress = await getUserProgress(participantId, condition);

  // Add to completed videos if not already there
  if (!progress.completedVideos.includes(videoId)) {
    progress.completedVideos.push(videoId);
  }

  // Update highest score (store the number of correct answers)
  const currentHighScore = progress.videoScores[videoId];
  // Save score if it's the first attempt OR if it's higher than previous
  if (currentHighScore === undefined || score > currentHighScore) {
    progress.videoScores[videoId] = score;
  }

  await saveUserProgress(participantId, condition, progress);
}

/**
 * Get the highest score for a video in the current condition
 */
export async function getVideoScore(participantId: string, condition: Condition, videoId: string): Promise<number | null> {
  const progress = await getUserProgress(participantId, condition);
  // Use ?? instead of || to properly handle score of 0
  return progress.videoScores[videoId] ?? null;
}

/**
 * Check if a video is completed in the current condition
 */
export async function isVideoCompleted(participantId: string, condition: Condition, videoId: string): Promise<boolean> {
  const progress = await getUserProgress(participantId, condition);
  return progress.completedVideos.includes(videoId);
}
