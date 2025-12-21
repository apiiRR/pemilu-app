-- Migration untuk Admin Users Table
-- Created: 2025-01-20

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Admin users can view all admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert admin users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin users can update admin users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can delete admin users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (true);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = user_id_param AND is_active = true
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Function to add admin user
CREATE OR REPLACE FUNCTION add_admin_user(
  new_user_id uuid,
  new_email text,
  new_full_name text DEFAULT NULL,
  new_role text DEFAULT 'admin',
  creator_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_users (user_id, email, full_name, role, created_by)
  VALUES (new_user_id, new_email, new_full_name, new_role, creator_id)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = now();
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Comments for documentation
COMMENT ON TABLE admin_users IS 'Stores admin users with access to admin dashboard';
COMMENT ON FUNCTION is_user_admin(uuid) IS 'Checks if a user has admin privileges';
COMMENT ON FUNCTION add_admin_user(uuid,text,text,text,uuid) IS 'Adds a new admin user';
