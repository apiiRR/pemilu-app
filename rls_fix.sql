-- RLS Policy Fix for Voting System
-- Run this SQL directly in your Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;

-- Create new policies that allow public access for voting
CREATE POLICY "Public users can view employees for voting"
  ON employees FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public users can update their voting status"
  ON employees FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure votes table has proper public access
DROP POLICY IF EXISTS "Anyone can insert votes" ON votes;
CREATE POLICY "Public users can insert votes"
  ON votes FOR INSERT
  TO public
  WITH CHECK (true);
