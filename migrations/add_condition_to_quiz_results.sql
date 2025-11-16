-- Migration: Add condition column to quiz_results table
-- This allows tracking which condition (control, gamified_blue, gamified_green, etc.) 
-- the participant was in when they completed the quiz

-- Add condition column (matching the participants table condition field)
ALTER TABLE quiz_results
ADD COLUMN IF NOT EXISTS condition TEXT;

-- Add index on condition for faster queries
CREATE INDEX IF NOT EXISTS idx_quiz_results_condition ON quiz_results(condition);

-- Add index on participant_id + condition for analytics
CREATE INDEX IF NOT EXISTS idx_quiz_results_participant_condition ON quiz_results(participant_id, condition);

-- Optional: Add a foreign key constraint if you want to enforce referential integrity
-- This ensures the condition value matches a valid condition from the participants table
-- (Uncomment if desired)
-- ALTER TABLE quiz_results
-- ADD CONSTRAINT fk_quiz_results_condition
-- FOREIGN KEY (participant_id, condition) 
-- REFERENCES participants(id, condition);

