-- Migration untuk menghapus kolom voting dari voter_profiles
-- Created: 2025-01-15
-- Description: Remove can_vote and last_vote_at columns from voter_profiles table
--             Voting eligibility will be checked via employees.has_voted instead

-- Drop existing function that references old columns
DROP FUNCTION IF EXISTS debug_voter_eligibility(uuid);

-- Remove columns from voter_profiles table
ALTER TABLE voter_profiles DROP COLUMN IF EXISTS can_vote;
ALTER TABLE voter_profiles DROP COLUMN IF EXISTS last_vote_at;

-- Recreate the debug function without the removed columns
CREATE OR REPLACE FUNCTION debug_voter_eligibility(user_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  employee_id text,
  email text,
  has_profile boolean,
  profile_active boolean,
  registration_exists boolean,
  registration_approved boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vp.user_id,
    vp.employee_id,
    vp.email,
    (vp.id IS NOT NULL) as has_profile,
    vp.is_active as profile_active,
    (vr.id IS NOT NULL) as registration_exists,
    vr.is_approved as registration_approved
  FROM voter_profiles vp
  LEFT JOIN voter_registrations vr ON vp.employee_id = vr.employee_id
  WHERE vp.user_id = user_uuid;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_voter_eligibility(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE voter_profiles IS 'Active voter accounts with voting privileges - can_vote and last_vote_at removed, use employees.has_voted instead';
