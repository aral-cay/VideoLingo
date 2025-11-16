/**
 * Research Tracking Utilities
 * Handles sessions, video runs, and events tracking for the study
 */

import { supabase } from '../lib/supabase';
import { Condition } from './studyCondition';

export type { Condition };

// ============= SESSION TRACKING =============

let currentSessionId: string | null = null;
let sessionStartTime: number | null = null;

// Store participant info for restarting sessions
let currentParticipantId: string | null = null;
let currentCondition: Condition | null = null;
let currentDayNumber: number = 1;

/**
 * Start a new session when user logs in or returns to the tab
 */
export async function startSession(participantId: string, condition: Condition, dayNumber: number = 1): Promise<string | null> {
  try {
    // Prevent rapid duplicate session creation (React Strict Mode in development)
    const now = Date.now();
    if (now - lastSessionStartTime < 100) {
      console.log(`[Tracking] Skipping duplicate session start (${now - lastSessionStartTime}ms since last)`);
      return currentSessionId;
    }
    lastSessionStartTime = now;

    // End any existing session first to prevent orphaned sessions
    if (currentSessionId) {
      console.log(`[Tracking] Ending existing session ${currentSessionId} before starting new one`);
      await endSession('session_replaced');
    }

    // Store participant info for session restarts
    currentParticipantId = participantId;
    currentCondition = condition;
    currentDayNumber = dayNumber;

    console.log(`[Tracking] Attempting to start session for participant=${participantId}, condition=${condition}, day=${dayNumber}`);

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        participant_id: participantId,
        condition,
        day_number: dayNumber,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Tracking] Database error starting session:', error);
      console.error('[Tracking] Error details:', JSON.stringify(error, null, 2));
      return null;
    }

    currentSessionId = data.id;
    sessionStartTime = Date.now();

    console.log(`[Tracking] Session started successfully: ${currentSessionId} (day ${dayNumber}, ${condition})`);
    return data.id;
  } catch (error) {
    console.error('[Tracking] Exception in startSession:', error);
    return null;
  }
}

/**
 * End the current session
 */
export async function endSession(reason: string = 'normal'): Promise<void> {
  if (!currentSessionId) return;

  try {
    const duration = sessionStartTime ? Date.now() - sessionStartTime : null;
    
    const { error } = await supabase
      .from('sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_ms: duration,
        ended_reason: reason,
      })
      .eq('id', currentSessionId);

    if (error) {
      console.error('Error ending session:', error);
    } else {
      console.log(`[Tracking] Session ended: ${currentSessionId}, duration: ${duration}ms, reason: ${reason}`);
    }
    
    currentSessionId = null;
    sessionStartTime = null;
  } catch (error) {
    console.error('Failed to end session:', error);
  }
}

/**
 * End session synchronously (for beforeunload)
 * Uses sendBeacon for reliable delivery even during page unload
 */
function endSessionSync(reason: string = 'page_unload'): void {
  if (!currentSessionId) return;

  const duration = sessionStartTime ? Date.now() - sessionStartTime : null;
  const sessionIdToEnd = currentSessionId;

  // Store pending session end in localStorage for recovery if sendBeacon fails
  const pendingEnd = {
    sessionId: sessionIdToEnd,
    ended_at: new Date().toISOString(),
    duration_ms: duration,
    ended_reason: reason,
  };
  localStorage.setItem('pendingSessionEnd', JSON.stringify(pendingEnd));

  // Use sendBeacon with Supabase REST API for reliable delivery
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const url = `${supabaseUrl}/rest/v1/sessions?id=eq.${sessionIdToEnd}`;
    const body = JSON.stringify({
      ended_at: pendingEnd.ended_at,
      duration_ms: duration,
      ended_reason: reason,
    });

    // sendBeacon sends POST, but we need PATCH for Supabase updates
    // Use fetch with keepalive as fallback
    try {
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal',
        },
        body: body,
        keepalive: true, // Allows request to outlive the page
      }).then(() => {
        // Clear pending if successful
        localStorage.removeItem('pendingSessionEnd');
      }).catch(() => {
        // Keep pending for retry on next load
      });
    } catch (e) {
      console.error('[Tracking] Failed to send session end:', e);
    }
  }

  console.log(`[Tracking] Session ended (sync): ${sessionIdToEnd}, duration: ${duration}ms, reason: ${reason}`);

  currentSessionId = null;
  sessionStartTime = null;
}

/**
 * Get the current active session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

// ============= VIDEO RUN TRACKING =============

interface VideoRunMetrics {
  // Timing metrics (condition-specific, one will be NULL)
  timeToStartQuizMs?: number; // Control condition only
  timeToClickGenerateGameMs?: number; // Experimental condition only
  
  // Video interaction metrics (cumulative)
  videoCompletionPct?: number; // Captured when clicking return home
  numPauses?: number;
  numResumes?: number;
  captionsOnCount?: number;
  captionsOffCount?: number;
  
  // Quiz completion status
  quizCompleted?: boolean;
  
  // End tracking - only set when clicking return home
  endSession?: boolean; // Flag to trigger ended_at and time calculation
}

/**
 * Initialize or get existing video run for a participant + video combination
 * Uses UPSERT pattern - creates new entry if doesn't exist, otherwise returns existing
 * Note: started_at is only set on first creation, never updated
 */
export async function initializeVideoRun(
  participantId: string,
  condition: Condition,
  videoId: string,
  dayNumber: number = 1
): Promise<boolean> {
  try {
    // Use upsert with ON CONFLICT to ensure we have a video run entry
    // If entry exists, this does nothing (no update)
    // If entry doesn't exist, it creates one with started_at
    const { error } = await supabase
      .from('video_runs')
      .upsert({
        participant_id: participantId,
        video_id: videoId,
        condition,
        day_number: dayNumber,
        started_at: new Date().toISOString(),
        session_id: null, // Always null per new requirements
        time_to_click_play_ms: null, // Always null per new requirements
      }, {
        onConflict: 'participant_id,video_id',
        ignoreDuplicates: true, // Don't update if already exists
      });

    if (error) {
      console.error('Error initializing video run:', error);
      return false;
    }

    console.log(`[Tracking] Video run initialized for participant ${participantId}, video ${videoId}`);
    return true;
  } catch (error) {
    console.error('Failed to initialize video run:', error);
    return false;
  }
}

/**
 * Update video run metrics for a participant + video combination
 * Uses the composite key (participant_id, video_id) instead of video_run_id
 */
export async function updateVideoRun(
  participantId: string,
  videoId: string,
  metrics: VideoRunMetrics
): Promise<void> {
  try {
    // Convert camelCase to snake_case for database
    const dbMetrics: any = {};
    
    // Timing metrics (condition-specific)
    if (metrics.timeToStartQuizMs !== undefined) dbMetrics.time_to_start_quiz_ms = metrics.timeToStartQuizMs;
    if (metrics.timeToClickGenerateGameMs !== undefined) dbMetrics.time_to_click_generate_game_ms = metrics.timeToClickGenerateGameMs;
    
    // Video interaction metrics
    if (metrics.videoCompletionPct !== undefined) dbMetrics.video_completion_pct = metrics.videoCompletionPct;
    if (metrics.numPauses !== undefined) dbMetrics.num_pauses = metrics.numPauses;
    if (metrics.numResumes !== undefined) dbMetrics.num_resumes = metrics.numResumes;
    if (metrics.captionsOnCount !== undefined) dbMetrics.captions_on_count = metrics.captionsOnCount;
    if (metrics.captionsOffCount !== undefined) dbMetrics.captions_off_count = metrics.captionsOffCount;
    
    // Quiz completion
    if (metrics.quizCompleted !== undefined) dbMetrics.quiz_completed = metrics.quizCompleted;

    // ONLY set ended_at when explicitly ending the session (return home click)
    if (metrics.endSession) {
      dbMetrics.ended_at = new Date().toISOString();
      
      // Calculate time_to_click_return_home_ms as the delta between ended_at and started_at
      // We'll use a subquery to calculate this in the database
      const { data, error: selectError } = await supabase
        .from('video_runs')
        .select('started_at')
        .eq('participant_id', participantId)
        .eq('video_id', videoId)
        .single();
      
      if (!selectError && data) {
        const startedAt = new Date(data.started_at).getTime();
        const endedAt = new Date(dbMetrics.ended_at).getTime();
        dbMetrics.time_to_click_return_home_ms = endedAt - startedAt;
      }
    }

    const { error } = await supabase
      .from('video_runs')
      .update(dbMetrics)
      .eq('participant_id', participantId)
      .eq('video_id', videoId);

    if (error) {
      console.error('Error updating video run:', error);
      console.error('Error details:', error);
    } else {
      console.log(`[Tracking] Video run updated for participant ${participantId}, video ${videoId}`);
    }
  } catch (error) {
    console.error('Failed to update video run:', error);
  }
}

// ============= EVENT TRACKING =============

/**
 * Track a discrete event (button click, video pause, etc.)
 * Events are self-contained with participant_id, condition, and metadata
 */
export async function trackEvent(
  participantId: string,
  condition: Condition,
  eventType: string,
  dayNumber: number = 1,
  meta?: Record<string, any>
): Promise<void> {
  try {
    await supabase
      .from('events')
      .insert({
        participant_id: participantId,
        session_id: currentSessionId,
        condition,
        day_number: dayNumber,
        event_type: eventType,
        event_time: new Date().toISOString(),
        meta: meta || null,
      });

    console.log(`[Tracking] Event: ${eventType}`, meta);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// ============= UTILITY FUNCTIONS =============

// Track if we've already set up event listeners
let trackingInitialized = false;
// Track last session start time to prevent rapid duplicate sessions (React Strict Mode)
let lastSessionStartTime: number = 0;

/**
 * Process any pending session ends that didn't complete (e.g., from page close)
 */
async function processPendingSessionEnd(): Promise<void> {
  const pendingData = localStorage.getItem('pendingSessionEnd');
  if (!pendingData) return;

  try {
    const pending = JSON.parse(pendingData);
    console.log('[Tracking] Found pending session end, processing:', pending);

    const { error } = await supabase
      .from('sessions')
      .update({
        ended_at: pending.ended_at,
        duration_ms: pending.duration_ms,
        ended_reason: pending.ended_reason,
      })
      .eq('id', pending.sessionId);

    if (error) {
      console.error('[Tracking] Error processing pending session end:', error);
    } else {
      console.log('[Tracking] Successfully processed pending session end');
      localStorage.removeItem('pendingSessionEnd');
    }
  } catch (e) {
    console.error('[Tracking] Failed to parse pending session end:', e);
    localStorage.removeItem('pendingSessionEnd');
  }
}

/**
 * Initialize tracking when user logs in
 */
export async function initializeTracking(participantId: string, condition: Condition, dayNumber: number = 1): Promise<void> {
  // Process any pending session ends from previous page close
  await processPendingSessionEnd();

  // Start new session
  await startSession(participantId, condition, dayNumber);

  // Only set up event listeners once
  if (!trackingInitialized) {
    // Track page visibility changes
    const handleVisibilityChange = async () => {
      console.log(`[Tracking] Visibility changed: hidden=${document.hidden}, participantId=${currentParticipantId}, condition=${currentCondition}`);

      if (document.hidden) {
        // Tab hidden/minimized - end current session
        console.log('[Tracking] Tab hidden - ending session...');
        await endSession('tab_hidden').catch(err =>
          console.error('Failed to end session on visibility change:', err)
        );
      } else {
        // Tab visible again - start new session if we have participant info
        console.log('[Tracking] Tab visible - checking for session restart...');
        if (currentParticipantId && currentCondition) {
          console.log('[Tracking] Restarting session...');
          await startSession(currentParticipantId, currentCondition, currentDayNumber);
        } else {
          console.warn('[Tracking] Cannot restart session - missing participant info:', {
            participantId: currentParticipantId,
            condition: currentCondition,
            dayNumber: currentDayNumber
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track session end on page unload (browser close, navigation away)
    const handleBeforeUnload = () => {
      endSessionSync('page_unload');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also handle pagehide for mobile browsers
    const handlePageHide = () => {
      endSessionSync('page_hide');
    };
    window.addEventListener('pagehide', handlePageHide);
    
    trackingInitialized = true;
    console.log('[Tracking] Event listeners initialized - sessions will auto-restart on tab return');
  }
}

/**
 * Clean up tracking (call on logout)
 */
export async function cleanupTracking(): Promise<void> {
  await endSession('logout');
  
  // Clear stored participant info to prevent auto-restart after logout
  currentParticipantId = null;
  currentCondition = null;
  currentDayNumber = 1;
}

