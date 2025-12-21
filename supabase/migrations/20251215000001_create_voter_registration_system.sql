-- Migration untuk Sistem Registrasi Voter
-- Created: 2025-01-15

-- Tabel untuk menyimpan data registrasi voter yang belum diapprove
CREATE TABLE IF NOT EXISTS voter_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL, -- NIP dari tabel employees
  email text NOT NULL,
  face_photo_url text, -- URL foto wajah yang diupload
  registration_date timestamptz DEFAULT now(),
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabel untuk voter profiles yang sudah aktif
CREATE TABLE IF NOT EXISTS voter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE NOT NULL, -- NIP dari tabel employees
  email text NOT NULL,
  face_photo_url text,
  is_active boolean DEFAULT true,
  can_vote boolean DEFAULT true,
  last_vote_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE voter_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk voter_registrations
CREATE POLICY "Anyone can insert voter registration"
  ON voter_registrations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view voter registrations"
  ON voter_registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update voter registrations"
  ON voter_registrations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies untuk voter_profiles
CREATE POLICY "Anyone can view active voter profiles"
  ON voter_profiles FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all voter profiles"
  ON voter_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert voter profiles"
  ON voter_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update voter profiles"
  ON voter_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete voter profiles"
  ON voter_profiles FOR DELETE
  TO authenticated
  USING (true);

-- Function untuk approve voter registration
CREATE OR REPLACE FUNCTION approve_voter_registration(
  registration_id uuid,
  approver_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status registrasi
  UPDATE voter_registrations 
  SET is_approved = true, 
      approved_by = approver_id, 
      approved_at = now(),
      updated_at = now()
  WHERE id = registration_id;
  
  -- Buat voter profile dari data registrasi
  INSERT INTO voter_profiles (employee_id, email, face_photo_url)
  SELECT employee_id, email, face_photo_url
  FROM voter_registrations 
  WHERE id = registration_id
  ON CONFLICT (employee_id) DO NOTHING;
END;
$$;

-- Function untuk create voter account after email verification
CREATE OR REPLACE FUNCTION create_voter_account(
  user_id uuid,
  employee_id text,
  email text,
  face_photo_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create auth user first (handled by Supabase Auth)
  -- Then create voter profile
  INSERT INTO voter_profiles (user_id, employee_id, email, face_photo_url)
  VALUES (user_id, employee_id, email, face_photo_url)
  ON CONFLICT (employee_id) DO UPDATE SET
    user_id = user_id,
    email = email,
    face_photo_url = face_photo_url,
    updated_at = now();
END;
$$;

-- Function to check if employee can register
CREATE OR REPLACE FUNCTION can_employee_register(employee_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp_exists boolean;
  already_registered boolean;
BEGIN
  -- Check if employee exists in employees table
  SELECT EXISTS(SELECT 1 FROM employees WHERE employee_id = employee_id_param) INTO emp_exists;
  
  IF NOT emp_exists THEN
    RETURN false;
  END IF;
  
  -- Check if already registered as voter
  SELECT EXISTS(
    SELECT 1 FROM voter_profiles 
    WHERE employee_id = employee_id_param AND is_active = true
  ) INTO already_registered;
  
  IF already_registered THEN
    RETURN false;
  END IF;
  
  -- Check if has pending registration
  SELECT EXISTS(
    SELECT 1 FROM voter_registrations 
    WHERE employee_id = employee_id_param AND is_approved = false
  ) INTO already_registered;
  
  IF already_registered THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voter_registrations_employee_id ON voter_registrations(employee_id);
CREATE INDEX IF NOT EXISTS idx_voter_registrations_email ON voter_registrations(email);
CREATE INDEX IF NOT EXISTS idx_voter_registrations_approved ON voter_registrations(is_approved);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_employee_id ON voter_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_user_id ON voter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_active ON voter_profiles(is_active);

-- Update employees table to link with voter system
ALTER TABLE employees ADD COLUMN IF NOT EXISTS has_voter_account boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS voter_profile_id uuid REFERENCES voter_profiles(id);

-- Comments for documentation
COMMENT ON TABLE voter_registrations IS 'Stores voter registration requests pending admin approval';
COMMENT ON TABLE voter_profiles IS 'Active voter accounts with voting privileges';
COMMENT ON FUNCTION can_employee_register(text) IS 'Checks if an employee can register as voter';
