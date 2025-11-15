/**
 * Video State Management with Supabase
 * Tracks video position, captions state, etc. per participant
 */

import { supabase } from '../lib/supabase';

export interface VideoState {
  completionPercent: number;
  lastPositionSec: number;
  lastCaptionState: boolean;
}

/**
 * Get video state from Supabase for a participant
 */
export async function getVideoState(participantId: string, videoId: string): Promise<VideoState | null> {
  try {
    const { data, error } = await supabase
      .from('video_states')
      .select('completion_percent, last_position_sec, last_caption_state')
      .eq('participant_id', participantId)
      .eq('video_id', videoId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching video state:', error);
      return null;
    }

    if (data) {
      return {
        completionPercent: Number(data.completion_percent) || 0,
        lastPositionSec: Number(data.last_position_sec) || 0,
        lastCaptionState: Boolean(data.last_caption_state),
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get video state:', error);
    return null;
  }
}

/**
 * Save video state to Supabase for a participant
 */
export async function saveVideoState(
  participantId: string,
  videoId: string,
  state: VideoState
): Promise<void> {
  try {
    const { error } = await supabase
      .from('video_states')
      .upsert({
        participant_id: participantId,
        video_id: videoId,
        completion_percent: state.completionPercent,
        last_position_sec: state.lastPositionSec,
        last_caption_state: state.lastCaptionState,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'participant_id,video_id',
      });

    if (error) {
      console.error('Error saving video state:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to save video state:', error);
    throw error;
  }
}

