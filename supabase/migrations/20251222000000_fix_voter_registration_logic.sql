-- Fix voter registration logic to allow re-registration
-- Created: 2025-01-22

-- Drop existing function first
DROP FUNCTION IF EXISTS can_employee_register(text);

-- Recreate function with improved logic
CREATE OR REPLACE FUNCTION can_employee_register(employee_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp_exists boolean;
  has_active_voter_profile boolean;
BEGIN
  -- Check if employee exists in employees table
  SELECT EXISTS(SELECT 1 FROM employees WHERE employee_id = employee_id_param) INTO emp_exists;
  
  IF NOT emp_exists THEN
    RETURN false;
  END IF;
  
  -- Check if already has active voter profile (this is what we really care about)
  SELECT EXISTS(
    SELECT 1 FROM voter_profiles 
    WHERE employee_id = employee_id_param AND is_active = true
  ) INTO has_active_voter_profile;
  
  IF has_active_voter_profile THEN
    RETURN false;
  END IF;
  
  -- Allow registration even if there are pending registrations
  -- User can always register again if previous registration failed
  
  RETURN true;
END;
$$;

-- Add comment
COMMENT ON FUNCTION can_employee_register(text) IS 'Allows re-registration if no active voter profile exists';

-- Create migration to clean up any stuck registrations
-- This is optional but helpful if there are old stuck records
DO $$
BEGIN
  -- You can uncomment this to clean up old pending registrations
  -- but be careful as it will delete pending registrations that might be valid
  
  /*
  DELETE FROM voter_registrations 
  WHERE is_approved = false 
  AND registration_date < now() - interval '7 days';
  */
  
  RAISE NOTICE 'Voter registration logic updated to allow re-registration';
END $$;

