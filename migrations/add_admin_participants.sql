-- Migration: Add admin participants for testing
-- Purpose: Create two admin users that behave normally but are hidden from other users
-- Date: 2025-11-18

-- Insert LanguageLearner (control group admin)
INSERT INTO participants (username, password_hash, cohort, condition, day_number, video_batch, character)
VALUES (
  'LanguageLearner',
  'admin!',
  'A',
  'control',
  1,
  'videos_batch1.json',
  'purple'
);

-- Insert GamifiedLanguageLearner (experimental group admin)
INSERT INTO participants (username, password_hash, cohort, condition, day_number, video_batch, character)
VALUES (
  'GamifiedLanguageLearner',
  'admin!',
  'B',
  'experimental',
  1,
  'videos_batch1.json',
  'purple'
);

-- Note: These users will be filtered out from leaderboard and journey displays
-- for other users via frontend queries, but they will see all other users normally.

