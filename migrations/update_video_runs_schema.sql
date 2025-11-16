-- Migration: Update video_runs schema for unique participant+video tracking
-- This changes video_runs to track unique (participant_id, video_id) pairs
-- and removes redundant fields that are tracked elsewhere

-- Step 1: Remove redundant quiz-related columns (tracked in quiz tables)
ALTER TABLE video_runs
DROP COLUMN IF EXISTS quiz_score,
DROP COLUMN IF EXISTS quiz_attempts,
DROP COLUMN IF EXISTS questions_answered,
DROP COLUMN IF EXISTS questions_correct,
DROP COLUMN IF EXISTS questions_incorrect,
DROP COLUMN IF EXISTS avg_question_response_time_ms,
DROP COLUMN IF EXISTS total_question_response_time_ms,
DROP COLUMN IF EXISTS score_accuracy;

-- Step 2: Remove time_on_page_ms (redundant with time_to_click_return_home_ms)
ALTER TABLE video_runs
DROP COLUMN IF EXISTS time_on_page_ms;

-- Step 3: Remove gamification columns (tracked in separate tables)
ALTER TABLE video_runs
DROP COLUMN IF EXISTS xp_gained,
DROP COLUMN IF EXISTS video_stars,
DROP COLUMN IF EXISTS hearts_remaining;

-- Step 4: Remove num_popup_show and num_popup_hide (not needed for core tracking)
ALTER TABLE video_runs
DROP COLUMN IF EXISTS num_popup_show,
DROP COLUMN IF EXISTS num_popup_hide;

-- Step 5: Rename columns for clarity
ALTER TABLE video_runs
RENAME COLUMN num_video_pauses TO num_pauses;

ALTER TABLE video_runs
RENAME COLUMN num_video_resumes TO num_resumes;

ALTER TABLE video_runs
RENAME COLUMN time_to_click_start_quiz_ms TO time_to_start_quiz_ms;

-- Step 6: Add time_to_click_return_home_ms if not exists
ALTER TABLE video_runs
ADD COLUMN IF NOT EXISTS time_to_click_return_home_ms INTEGER;

-- Step 7: Drop old primary key constraint if exists
-- Note: We need to get the actual constraint name first, this is a placeholder
-- The actual constraint name might be different depending on how the table was created
ALTER TABLE video_runs
DROP CONSTRAINT IF EXISTS video_runs_pkey;

-- Step 8: Drop the auto-increment id column (it's being replaced by composite unique)
ALTER TABLE video_runs
DROP COLUMN IF EXISTS id;

-- Step 9: Add unique constraint on (participant_id, video_id)
-- This makes each (participant, video) combination unique and tracked in place
ALTER TABLE video_runs
ADD CONSTRAINT video_runs_participant_video_key 
UNIQUE (participant_id, video_id);

-- Step 10: Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_runs_participant_video 
ON video_runs(participant_id, video_id);

-- Step 11: Add index for participant queries
CREATE INDEX IF NOT EXISTS idx_video_runs_participant 
ON video_runs(participant_id);

-- Step 12: Add index for video queries
CREATE INDEX IF NOT EXISTS idx_video_runs_video 
ON video_runs(video_id);

-- Note: After this migration:
-- - session_id will remain in the table but should always be NULL
-- - time_to_click_play_ms will remain but should always be NULL
-- - Use UPSERT pattern: INSERT ... ON CONFLICT (participant_id, video_id) DO UPDATE
-- - started_at is set once and never updated
-- - ended_at and derived metrics are updated when user clicks return home

