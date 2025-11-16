/**
 * Telemetry/Tracking Utility
 * Tracks user interactions for A/B testing between Gamified (Experimental) and Control versions
 */

import { supabase } from '../lib/supabase';
import { isGamifiedVersion } from './userVersion';
import { Condition } from './studyCondition';

export type TelemetryEvent = 
  // Home page events
  | 'home_page_view'
  | 'home_page_time'
  | 'leaderboard_view_time'
  | 'visit_time'
  | 'time_between_visits'
  | 'click_play' // Gamified
  | 'click_watch' // Control
  | 'click_home'
  | 'click_start' // Gamified
  // Video player page events
  | 'video_page_view'
  | 'video_page_time'
  | 'click_generate_game' // Gamified - "Open" button
  | 'click_start_quiz' // Control
  | 'video_pause'
  | 'video_resume'
  | 'video_completion_percent'
  | 'popup_hide'
  | 'popup_show'
  | 'question_response_time'
  | 'question_correct'
  | 'question_incorrect'
  | 'questions_answered'
  | 'quiz_completion' // yes or no
  | 'captions_on'
  | 'captions_off'
  | 'quiz_completion_time'
  | 'click_return_home'
  // Gamified-specific events
  | 'xp_gained'
  | 'video_stars'
  | 'hearts_remaining'
  // Control-specific events
  | 'score_accuracy';

export interface TelemetryData {
  user_id: string;
  username: string;
  version: 'experimental' | 'control';
  event_type: TelemetryEvent;
  page: 'home' | 'video_player';
  video_id?: string;
  timestamp: string;
  // Event-specific data
  data?: {
    // Time tracking
    duration_ms?: number;
    time_to_action_ms?: number;
    // Video tracking
    completion_percent?: number;
    // Quiz tracking
    question_index?: number;
    response_time_ms?: number;
    is_correct?: boolean;
    total_questions?: number;
    questions_answered?: number;
    quiz_completed?: boolean;
    // Gamified tracking
    xp_gained?: number;
    video_stars?: number;
    hearts_remaining?: number;
    // Control tracking
    score_accuracy?: number;
    // Other
    [key: string]: any;
  };
}

/**
 * Track a telemetry event
 */
export async function trackEvent(
  participantId: string | null,
  username: string | null,
  eventType: TelemetryEvent,
  page: 'home' | 'video_player',
  data?: TelemetryData['data'],
  videoId?: string,
  condition?: Condition | null
): Promise<void> {
  if (!participantId || !username) {
    console.warn('Cannot track event: user not authenticated');
    return;
  }

  const version = isGamifiedVersion(condition) ? 'experimental' : 'control';

  const telemetryData: TelemetryData = {
    user_id: participantId,
    username,
    version,
    event_type: eventType,
    page,
    video_id: videoId,
    timestamp: new Date().toISOString(),
    data: data || {},
  };

  try {
    const { error } = await supabase
      .from('telemetry')
      .insert(telemetryData);

    if (error) {
      console.error('Error tracking event:', error);
      // Don't throw - telemetry failures shouldn't break the app
    }
  } catch (error) {
    console.error('Failed to track event:', error);
    // Don't throw - telemetry failures shouldn't break the app
  }
}

/**
 * Track page view and start time tracking
 */
export function trackPageView(
  participantId: string | null,
  username: string | null,
  page: 'home' | 'video_player',
  videoId?: string
): () => void {
  if (!participantId || !username) return () => {};

  const startTime = Date.now();
  const eventType = page === 'home' ? 'home_page_view' : 'video_page_view';

  trackEvent(participantId, username, eventType, page, undefined, videoId);

  // Return cleanup function to track time on page
  return () => {
    const duration = Date.now() - startTime;
    const timeEventType = page === 'home' ? 'home_page_time' : 'video_page_time';
    trackEvent(participantId, username, timeEventType, page, { duration_ms: duration }, videoId);
  };
}

/**
 * Track time to action (e.g., time to click a button)
 */
export function trackTimeToAction(
  participantId: string | null,
  username: string | null,
  eventType: TelemetryEvent,
  page: 'home' | 'video_player',
  startTime: number,
  videoId?: string
): void {
  const timeToAction = Date.now() - startTime;
  trackEvent(participantId, username, eventType, page, { time_to_action_ms: timeToAction }, videoId);
}

/**
 * Track visit times and time between visits
 */
export async function trackVisit(
  participantId: string,
  username: string,
  page: 'home' | 'video_player'
): Promise<void> {
  const now = Date.now();
  
  // Get last visit time from localStorage
  const lastVisitKey = `last_visit_${page}_${participantId}`;
  const lastVisitTime = localStorage.getItem(lastVisitKey);
  
  // Track visit time
  trackEvent(participantId, username, 'visit_time', page, {
    visit_timestamp: now,
  });

  // Track time between visits if we have a previous visit
  if (lastVisitTime) {
    const timeBetween = now - parseInt(lastVisitTime, 10);
    trackEvent(participantId, username, 'time_between_visits', page, {
      time_between_visits_ms: timeBetween,
    });
  }

  // Update last visit time
  localStorage.setItem(lastVisitKey, now.toString());
}

/**
 * Track leaderboard view time (Gamified only)
 */
export function trackLeaderboardView(
  participantId: string | null,
  username: string | null,
  startTime: number,
  condition?: Condition | null
): () => void {
  if (!participantId || !username || !isGamifiedVersion(condition)) return () => {};

  return () => {
    const duration = Date.now() - startTime;
    trackEvent(participantId, username, 'leaderboard_view_time', 'home', {
      duration_ms: duration,
    });
  };
}

