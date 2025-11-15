/**
 * Quiz Results Management with Supabase
 */

import { supabase } from '../lib/supabase';

export interface QuizResult {
  videoId: string;
  completedAt: number;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  scoreAccuracy: number;
}

/**
 * Save quiz results to Supabase
 */
export async function saveQuizResult(participantId: string, result: QuizResult): Promise<void> {
  try {
    const { error } = await supabase
      .from('quiz_results')
      .insert({
        participant_id: participantId,
        video_id: result.videoId,
        correct_count: result.correctCount,
        incorrect_count: result.incorrectCount,
        total_questions: result.totalQuestions,
        score_accuracy: result.scoreAccuracy,
        completed_at: new Date(result.completedAt).toISOString(),
      });

    if (error) {
      console.error('Error saving quiz result:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to save quiz result:', error);
    throw error;
  }
}

