-- Migration: Add video_batch column to participants table
-- Purpose: Track which video batch JSON file each participant should use
-- Date: 2025-11-16

-- Add video_batch column with default value
ALTER TABLE participants
ADD COLUMN video_batch TEXT NOT NULL DEFAULT 'videos_batch1.json';

-- Add comment to document the column
COMMENT ON COLUMN participants.video_batch IS 'Specifies which video batch JSON file the participant should use (videos_batch1.json or videos_batch2.json)';

-- Update existing participants to explicitly set the default value
UPDATE participants
SET video_batch = 'videos_batch1.json'
WHERE video_batch IS NULL;

-- Add check constraint to ensure only valid batch names
ALTER TABLE participants
ADD CONSTRAINT check_video_batch_valid 
CHECK (video_batch IN ('videos_batch1.json', 'videos_batch2.json'));

