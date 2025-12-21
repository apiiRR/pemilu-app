-- Migration untuk fix voting authentication issue
-- Created: 2025-01-15

-- Drop existing function and recreate with better logic
DROP FUNCTION IF EXISTS approve_voter_registration(uuid, uuid);

CREATE OR REPLACE FUNCTION approve_voter_registration(
  registration_id uuid,
  approver_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reg_record RECORD;
  existing_profile RECORD;
BEGIN
  -- Get registration record
  SELECT * INTO reg_record
  FROM voter_registrations 
  WHERE id = registration_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  IF reg_record.is_approved THEN
    RAISE NOTICE 'Registration already approved';
    RETURN;
  END IF;
  
  -- Update registration status
  UPDATE voter_registrations 
  SET is_approved = true, 
      approved_by = approver_id, 
      approved_at = now(),
      updated_at = now()
  WHERE id = registration_id;
  
  -- Check if voter profile already exists
  SELECT * INTO existing_profile
  FROM voter_profiles 
  WHERE employee_id = reg_record.employee_id;
  
  IF FOUND THEN
    -- Update existing profile (remove can_vote and last_vote_at references)
    UPDATE voter_profiles 
    SET user_id = reg_record.user_id,
        email = reg_record.email,
        face_photo_url = reg_record.face_photo_url,
        is_active = true,
        updated_at = now()
    WHERE employee_id = reg_record.employee_id;
    
    RAISE NOTICE 'Updated existing voter profile for employee: %', reg_record.employee_id;
  ELSE
    -- Create new voter profile (remove can_vote and last_vote_at columns)
    INSERT INTO voter_profiles (
      user_id, 
      employee_id, 
      email, 
      face_photo_url, 
      is_active
    )
    VALUES (
      reg_record.user_id,
      reg_record.employee_id, 
      reg_record.email, 
      reg_record.face_photo_url, 
      true
    );
    
    RAISE NOTICE 'Created new voter profile for employee: %', reg_record.employee_id;
  END IF;
  
  -- Update employees table if exists
  UPDATE employees 
  SET has_voter_account = true,
      voter_profile_id = (
        SELECT id FROM voter_profiles WHERE employee_id = reg_record.employee_id
      )
  WHERE employee_id = reg_record.employee_id;
  
END;
$$;

-- Function untuk fix voter profiles yang orphaned
CREATE OR REPLACE FUNCTION fix_voter_profiles() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reg_record RECORD;
BEGIN
  -- Find registrations that are approved but don't have voter profiles
  FOR reg_record IN 
    SELECT vr.* 
    FROM voter_registrations vr
    LEFT JOIN voter_profiles vp ON vr.employee_id = vp.employee_id
    WHERE vr.is_approved = true 
    AND vp.id IS NULL
  LOOP
    RAISE NOTICE 'Creating voter profile for approved registration: %', reg_record.id;
    
    -- Create voter profile
    INSERT INTO voter_profiles (
      user_id, 
      employee_id, 
      email, 
      face_photo_url, 
      is_active, 
      can_vote
    )
    VALUES (
      reg_record.user_id,
      reg_record.employee_id, 
      reg_record.email, 
      reg_record.face_photo_url, 
      true, 
      true
    );
    
    -- Update employees table
    UPDATE employees 
    SET has_voter_account = true,
        voter_profile_id = (
          SELECT id FROM voter_profiles WHERE employee_id = reg_record.employee_id
        )
    WHERE employee_id = reg_record.employee_id;
    
  END LOOP;
  
  RAISE NOTICE 'Voter profile fix completed';
END;
$$;

-- Fix RLS policies untuk voter_profiles (lebih permisif untuk debugging)
DROP POLICY IF EXISTS "Anyone can view active voter profiles" ON voter_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all voter profiles" ON voter_profiles;

CREATE POLICY "Enable read access for authenticated users"
  ON voter_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON voter_profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_voter_profiles_user_id_employee_id 
ON voter_profiles(user_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_voter_registrations_approved_user 
ON voter_registrations(is_approved, user_id);

-- Function untuk debugging voter eligibility
CREATE OR REPLACE FUNCTION debug_voter_eligibility(user_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  employee_id text,
  email text,
  has_profile boolean,
  profile_active boolean,
  can_vote boolean,
  last_vote_at timestamptz,
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
    vp.can_vote,
    vp.last_vote_at,
    (vr.id IS NOT NULL) as registration_exists,
    vr.is_approved as registration_approved
  FROM voter_profiles vp
  LEFT JOIN voter_registrations vr ON vp.employee_id = vr.employee_id
  WHERE vp.user_id = user_uuid;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_voter_registration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_voter_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_voter_eligibility(uuid) TO authenticated;
