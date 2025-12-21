-- Migration untuk menambahkan unique constraint pada NIP (employee_id) di voter_registrations
-- Created: 2025-01-15
-- Description: Ensure each NIP can only be used for one voter registration

-- Add unique constraint to prevent duplicate NIP registrations
ALTER TABLE voter_registrations 
ADD CONSTRAINT unique_employee_id_registration 
UNIQUE (employee_id);

-- Create function to check if NIP is already registered
CREATE OR REPLACE FUNCTION check_nip_availability(employee_id text)
RETURNS TABLE (
  is_available boolean,
  existing_registration_id uuid,
  existing_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vr.id IS NULL as is_available,
    vr.id as existing_registration_id,
    vr.email as existing_email
  FROM voter_registrations vr
  WHERE vr.employee_id = employee_id
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_nip_availability(text) TO authenticated;

-- Create function to validate registration before inserting
CREATE OR REPLACE FUNCTION validate_voter_registration(
  p_employee_id text,
  p_email text
) RETURNS TABLE (
  is_valid boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_reg RECORD;
BEGIN
  -- Check if NIP is already registered
  SELECT * INTO existing_reg
  FROM voter_registrations 
  WHERE employee_id = p_employee_id;
  
  IF FOUND THEN
    IF existing_reg.is_approved THEN
      RETURN QUERY SELECT false, 'NIP ini sudah terdaftar dan disetujui. Silakan gunakan NIP lain atau hubungi admin.';
    ELSE
      RETURN QUERY SELECT false, 'NIP ini sedang dalam proses persetujuan. Silakan tunggu atau hubungi admin.';
    END IF;
  END IF;
  
  -- Check if NIP exists in employees table
  IF NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = p_employee_id) THEN
    RETURN QUERY SELECT false, 'NIP tidak ditemukan di database employee. Silakan periksa NIP Anda.';
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'NIP tersedia untuk registrasi'::text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_voter_registration(text, text) TO authenticated;

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_employee_id_registration ON voter_registrations IS 'Ensure each NIP can only be used for one voter registration';
