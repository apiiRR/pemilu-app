-- Add user_id column to voter_registrations table
-- Created: 2025-01-21

-- Add user_id column to voter_registrations
ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for user_id for better performance
CREATE INDEX IF NOT EXISTS idx_voter_registrations_user_id ON voter_registrations(user_id);

-- Update RLS policies to include user_id operations
DROP POLICY IF EXISTS "Authenticated users can update voter registrations" ON voter_registrations;

CREATE POLICY "Authenticated users can update voter registrations"
  ON voter_registrations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON COLUMN voter_registrations.user_id IS 'Links to auth.users.id after email verification';

