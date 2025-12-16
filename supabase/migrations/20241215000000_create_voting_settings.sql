-- Migration: Create voting_settings table for managing voting schedule
-- Created: 2024-12-15
-- Description: Add voting schedule management functionality

-- Create voting_settings table
CREATE TABLE IF NOT EXISTS voting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_name text NOT NULL DEFAULT 'Pemilihan Ketua Serikat Pekerja',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE voting_settings ENABLE ROW LEVEL SECURITY;

-- Policies for voting_settings table
CREATE POLICY "Anyone can view voting settings"
  ON voting_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert voting settings"
  ON voting_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update voting settings"
  ON voting_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete voting settings"
  ON voting_settings FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_voting_settings_updated_at
    BEFORE UPDATE ON voting_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default voting settings (inactive by default)
INSERT INTO voting_settings (start_time, end_time, is_active) 
VALUES (now() + interval '1 day', now() + interval '2 days', false)
ON CONFLICT DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_voting_settings_start_time ON voting_settings(start_time);
CREATE INDEX IF NOT EXISTS idx_voting_settings_end_time ON voting_settings(end_time);
CREATE INDEX IF NOT EXISTS idx_voting_settings_is_active ON voting_settings(is_active);

-- Create function to check if voting is currently open
CREATE OR REPLACE FUNCTION is_voting_open()
RETURNS boolean AS $$
DECLARE
    voting_record voting_settings%ROWTYPE;
BEGIN
    -- Get the most recent voting settings
    SELECT * INTO voting_record
    FROM voting_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no settings exist, voting is closed
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if voting is active and within time range
    RETURN voting_record.is_active 
        AND now() >= voting_record.start_time 
        AND now() <= voting_record.end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
