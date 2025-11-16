-- Migration: Add condition column to user_progress for batch/condition tracking
-- This allows tracking separate progress for each condition a participant experiences

-- Step 1: Add condition column to user_progress
ALTER TABLE user_progress
ADD COLUMN condition VARCHAR(20);

-- Step 2: Populate condition from participants table for existing rows
UPDATE user_progress up
SET condition = p.condition
FROM participants p
WHERE up.participant_id = p.id;

-- Step 3: Make condition NOT NULL now that all rows have values
ALTER TABLE user_progress
ALTER COLUMN condition SET NOT NULL;

-- Step 4: Drop old unique constraint on participant_id
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_participant_id_key;

-- Step 5: Add new unique constraint on (participant_id, condition)
-- This allows multiple rows per participant, one for each condition
ALTER TABLE user_progress
ADD CONSTRAINT user_progress_participant_condition_key 
UNIQUE (participant_id, condition);

-- Step 6: Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_progress_participant_condition 
ON user_progress(participant_id, condition);

-- Note: This migration preserves all existing progress data
-- After 3 days when conditions swap, new rows will be created automatically
-- for participants in their new condition

