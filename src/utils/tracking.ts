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

    // Create blob with proper headers for Supabase
    const blob = new Blob([body], { type: 'application/json' });

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
  timeOnPageMs?: number;
  timeToClickPlayMs?: number;
  timeToClickStartQuizMs?: number;
  timeToClickGenerateGameMs?: number;
  timeToClickReturnHomeMs?: number;
  videoCompletionPct?: number;
  numVideoPauses?: number;
  numVideoResumes?: number;
  numPopupShow?: number;
  numPopupHide?: number;
  captionsOnCount?: number;
  captionsOffCount?: number;
  quizCompleted?: boolean;
  questionsAnswered?: number;
  questionsCorrect?: number;
  questionsIncorrect?: number;
  avgQuestionResponseTimeMs?: number;
  totalQuestionResponseTimeMs?: number;
  xpGained?: number;
  videoStars?: number;
  heartsRemaining?: number;
  scoreAccuracy?: number;
}

/**
 * Create a new video run when user starts watching a video
 */
export async function createVideoRun(
  participantId: string,
  condition: Condition,
  videoId: string,
  dayNumber: number = 1
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('video_runs')
      .insert({
        participant_id: participantId,
        session_id: currentSessionId,
        video_id: videoId,
        condition,
        day_number: dayNumber,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating video run:', error);
      return null;
    }

    console.log(`[Tracking] Video run created: ${data.id} for video ${videoId}`);
    return data.id;
  } catch (error) {
    console.error('Failed to create video run:', error);
    return null;
  }
}

/**
 * Update an existing video run with metrics
 */
export async function updateVideoRun(
  videoRunId: string,
  metrics: VideoRunMetrics
): Promise<void> {
  try {
    // Convert camelCase to snake_case for database
    const dbMetrics: any = {};
    
    if (metrics.timeOnPageMs !== undefined) dbMetrics.time_on_page_ms = metrics.timeOnPageMs;
    if (metrics.timeToClickPlayMs !== undefined) dbMetrics.time_to_click_play_ms = metrics.timeToClickPlayMs;
    if (metrics.timeToClickStartQuizMs !== undefined) dbMetrics.time_to_click_start_quiz_ms = metrics.timeToClickStartQuizMs;
    if (metrics.timeToClickGenerateGameMs !== undefined) dbMetrics.time_to_click_generate_game_ms = metrics.timeToClickGenerateGameMs;
    if (metrics.timeToClickReturnHomeMs !== undefined) dbMetrics.time_to_click_return_home_ms = metrics.timeToClickReturnHomeMs;
    if (metrics.videoCompletionPct !== undefined) dbMetrics.video_completion_pct = metrics.videoCompletionPct;
    if (metrics.numVideoPauses !== undefined) dbMetrics.num_video_pauses = metrics.numVideoPauses;
    if (metrics.numVideoResumes !== undefined) dbMetrics.num_video_resumes = metrics.numVideoResumes;
    if (metrics.numPopupShow !== undefined) dbMetrics.num_popup_show = metrics.numPopupShow;
    if (metrics.numPopupHide !== undefined) dbMetrics.num_popup_hide = metrics.numPopupHide;
    if (metrics.captionsOnCount !== undefined) dbMetrics.captions_on_count = metrics.captionsOnCount;
    if (metrics.captionsOffCount !== undefined) dbMetrics.captions_off_count = metrics.captionsOffCount;
    if (metrics.quizCompleted !== undefined) dbMetrics.quiz_completed = metrics.quizCompleted;
    if (metrics.questionsAnswered !== undefined) dbMetrics.questions_answered = metrics.questionsAnswered;
    if (metrics.questionsCorrect !== undefined) dbMetrics.questions_correct = metrics.questionsCorrect;
    if (metrics.questionsIncorrect !== undefined) dbMetrics.questions_incorrect = metrics.questionsIncorrect;
    if (metrics.avgQuestionResponseTimeMs !== undefined) dbMetrics.avg_question_response_time_ms = metrics.avgQuestionResponseTimeMs;
    if (metrics.totalQuestionResponseTimeMs !== undefined) dbMetrics.total_question_response_time_ms = metrics.totalQuestionResponseTimeMs;
    if (metrics.xpGained !== undefined) dbMetrics.xp_gained = metrics.xpGained;
    if (metrics.videoStars !== undefined) dbMetrics.video_stars = metrics.videoStars;
    if (metrics.heartsRemaining !== undefined) dbMetrics.hearts_remaining = metrics.heartsRemaining;
    if (metrics.scoreAccuracy !== undefined) dbMetrics.score_accuracy = metrics.scoreAccuracy;

    dbMetrics.ended_at = new Date().toISOString();

    const { error } = await supabase
      .from('video_runs')
      .update(dbMetrics)
      .eq('id', videoRunId);

    if (error) {
      console.error('Error updating video run:', error);
    }
  } catch (error) {
    console.error('Failed to update video run:', error);
  }
}

// ============= EVENT TRACKING =============

/**
 * Track a discrete event (button click, video pause, etc.)
 */
export async function trackEvent(
  participantId: string,
  condition: Condition,
  eventType: string,
  dayNumber: number = 1,
  meta?: Record<string, any>,
  videoRunId?: string | null
): Promise<void> {
  try {
    await supabase
      .from('events')
      .insert({
        participant_id: participantId,
        session_id: currentSessionId,
        video_run_id: videoRunId || null,
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

