/**
 * Gamification Utilities
 * Handles XP, hearts, stars, and streak management
 */

import { supabase } from '../lib/supabase';

export interface GamificationData {
  xp: number;
  hearts: number;
  streakDays: number;
  lastActivityDate: string | null;
}

/**
 * Get participant gamification data
 */
export async function getGamificationData(participantId: string): Promise<GamificationData | null> {
  try {
    const { data, error } = await supabase
      .from('user_gamification')
      .select('xp, hearts, streak_days, last_activity_date')
      .eq('participant_id', participantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching gamification data:', error);
      return null;
    }

    if (data) {
      return {
        xp: data.xp || 0,
        hearts: data.hearts || 20, // 20 hearts daily
        streakDays: data.streak_days || 0,
        lastActivityDate: data.last_activity_date || null,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get gamification data:', error);
    return null;
  }
}

/**
 * Update participant gamification data
 */
export async function updateGamificationData(
  participantId: string,
  updates: Partial<GamificationData>
): Promise<void> {
  try {
    // Map camelCase to snake_case for database
    const dbUpdates: any = {
      participant_id: participantId,
      updated_at: new Date().toISOString(),
    };
    
    if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
    if (updates.hearts !== undefined) dbUpdates.hearts = updates.hearts;
    if (updates.streakDays !== undefined) dbUpdates.streak_days = updates.streakDays;
    if (updates.lastActivityDate !== undefined) dbUpdates.last_activity_date = updates.lastActivityDate;
    
    const { error } = await supabase
      .from('user_gamification')
      .upsert(dbUpdates, {
        onConflict: 'participant_id',
      });

    if (error) {
      console.error('Error updating gamification data:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update gamification data:', error);
    throw error;
  }
}

/**
 * Add XP to participant
 */
export async function addXP(participantId: string, amount: number): Promise<void> {
  const current = await getGamificationData(participantId);
  if (current) {
    await updateGamificationData(participantId, {
      xp: current.xp + amount,
    });
  }
}

/**
 * Reset daily hearts to 20
 */
export async function resetDailyHearts(participantId: string): Promise<void> {
  await updateGamificationData(participantId, { hearts: 20 });
}

/**
 * Update hearts (lives)
 */
export async function updateHearts(participantId: string, hearts: number): Promise<void> {
  await updateGamificationData(participantId, { hearts });
}

/**
 * Calculate stars based on quiz score
 * 3 stars: 10/10 perfect score
 * 2 stars: 7-9 questions correct
 * 1 star: Completing quiz (any score)
 */
export function calculateStars(correct: number, total: number): number {
  if (correct === 10 && total === 10) return 3; // Perfect 10/10
  if (correct >= 7 && correct <= 9) return 2; // 7-9 correct
  return 1; // Any completion = 1 star
}

/**
 * Calculate XP based on quiz performance
 * +5 XP per correct answer
 * +10 XP bonus for 8/10 or higher
 * +20 XP bonus for perfect 10/10
 */
export function calculateXP(correct: number, total: number): number {
  let xp = correct * 5; // +5 XP per correct answer
  
  if (correct >= 8) {
    xp += 10; // +10 bonus for 8/10 or higher
  }
  
  if (correct === 10 && total === 10) {
    xp += 20; // +20 bonus for perfect 10/10
  }
  
  return xp;
}

/**
 * Save video stars
 */
export async function saveVideoStars(participantId: string, videoId: string, stars: number): Promise<void> {
  try {
    // Get current progress
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('video_stars')
      .eq('participant_id', participantId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return;
    }

    const currentStars = (progressData?.video_stars as Record<string, number>) || {};
    const currentStarCount = currentStars[videoId] || 0;

    // Only update if new stars are higher
    if (stars > currentStarCount) {
      currentStars[videoId] = stars;

      const { error } = await supabase
        .from('user_progress')
        .update({
          video_stars: currentStars,
          updated_at: new Date().toISOString(),
        })
        .eq('participant_id', participantId);

      if (error) {
        console.error('Error saving video stars:', error);
      }
    }
  } catch (error) {
    console.error('Failed to save video stars:', error);
  }
}

/**
 * Get current date in EST timezone
 */
function getESTDate(): string {
  const now = new Date();
  // Convert to EST (UTC-5) or EDT (UTC-4) depending on DST
  const estOffset = -5 * 60; // EST is UTC-5
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const estTime = new Date(utc + (estOffset * 60000));
  
  // Check if it's after 11:59 PM EST, if so, it's the next day
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  
  // If it's 11:59 PM or later, consider it the next day for reset purposes
  if (hours === 23 && minutes >= 59) {
    estTime.setDate(estTime.getDate() + 1);
  }
  
  return estTime.toISOString().split('T')[0];
}

/**
 * Check if it's time to reset hearts (after 11:59 PM EST)
 */
function shouldResetHearts(lastResetDate: string | null): boolean {
  if (!lastResetDate) return true;
  
  const todayEST = getESTDate();
  const lastReset = new Date(lastResetDate);
  const lastResetEST = lastReset.toISOString().split('T')[0];
  
  return todayEST !== lastResetEST;
}

/**
 * Check and reset daily hearts at 11:59 PM EST
 */
export async function checkAndResetDailyHearts(participantId: string): Promise<void> {
  const current = await getGamificationData(participantId);
  if (!current) return;

  // Check if we need to reset hearts (new day in EST after 11:59 PM)
  if (shouldResetHearts(current.lastActivityDate)) {
    await updateGamificationData(participantId, { hearts: 20 });
  }
}

/**
 * Update streak - called when user logs in or completes activity
 * Checks if user logged in today (EST timezone)
 */
export async function updateStreak(participantId: string): Promise<void> {
  const current = await getGamificationData(participantId);
  if (!current) {
    // If no gamification data exists, create it with streak 1
    await updateGamificationData(participantId, {
      streakDays: 1,
      lastActivityDate: getESTDate(),
      hearts: 20,
      xp: 0,
    });
    return;
  }

  const todayEST = getESTDate();
  const lastActivity = current.lastActivityDate;
  let newStreak = current.streakDays || 0;

  // If streak is 0, always set it to 1 (first login or reset)
  if (newStreak === 0) {
    newStreak = 1;
  } else if (!lastActivity) {
    // No last activity but streak exists - set to 1
    newStreak = 1;
  } else {
    const lastDate = new Date(lastActivity);
    const lastActivityEST = lastDate.toISOString().split('T')[0];
    const todayDate = new Date(todayEST);
    const lastDateObj = new Date(lastActivityEST);
    const diffDays = Math.floor((todayDate.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day - if streak is 0, set it to 1, otherwise don't change
      if (newStreak === 0) {
        newStreak = 1;
      } else {
        return; // Don't update if same day and streak is already > 0
      }
    } else if (diffDays === 1) {
      // Consecutive day - increment streak
      newStreak = current.streakDays + 1;
    } else {
      // Streak broken - more than 1 day gap, reset to 1
      newStreak = 1;
    }
  }

  await updateGamificationData(participantId, {
    streakDays: newStreak,
    lastActivityDate: todayEST,
  });
}

/**
 * Check and update streak on login
 * This should be called when user logs in to track daily login streak
 */
export async function checkStreakOnLogin(participantId: string): Promise<void> {
  // First check and reset hearts for new day
  await checkAndResetDailyHearts(participantId);
  
  // Then update streak based on login
  await updateStreak(participantId);
}

/**
 * Check if participant can play (has hearts remaining)
 */
export async function canUserPlay(participantId: string): Promise<boolean> {
  const current = await getGamificationData(participantId);
  if (!current) return true; // Default to allowing play if no data
  
  // Check and reset hearts if new day
  await checkAndResetDailyHearts(participantId);
  
  // Get updated data
  const updated = await getGamificationData(participantId);
  return (updated?.hearts || 0) > 0;
}

