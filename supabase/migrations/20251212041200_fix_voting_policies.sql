-- Fix RLS policies for voting functionality
-- Allow public users to check employee status during voting

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;

-- Create new policy that allows public to view employee status for voting
CREATE POLICY "Public users can view employees for voting"
  ON employees FOR SELECT
  TO public
  USING (true);

-- Allow public users to update their voting status
CREATE POLICY "Public users can update their voting status"
  ON employees FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public users to insert votes
CREATE POLICY "Public users can insert votes"
  ON votes FOR INSERT
  TO public
  WITH CHECK (true);
