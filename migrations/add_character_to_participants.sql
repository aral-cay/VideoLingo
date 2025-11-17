-- Add character column to participants table
ALTER TABLE participants
ADD COLUMN character TEXT CHECK (character IN ('blue', 'gold', 'green', 'purple'));

-- Add comment
COMMENT ON COLUMN participants.character IS 'Character avatar assignment for gamified UI (blue, gold, green, purple)';

-- Assign characters to participants
UPDATE participants
SET character = CASE username
  -- Cohort A - Experimental
  WHEN 'BadBunny' THEN 'blue'
  WHEN 'Purplestar' THEN 'gold'
  WHEN 'Pajamas' THEN 'green'
  -- Cohort B - Control
  WHEN 'Joji' THEN 'purple'
  WHEN 'Violeta' THEN 'blue'
  WHEN 'Londontown' THEN 'gold'
END;

